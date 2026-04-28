import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export type AppRole = "admin" | "teacher" | "parent" | "bursar" | "librarian" | "system_admin";

interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: AppRole | null;
  roles: AppRole[];
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchUserRoles = async (userId: string): Promise<AppRole[]> => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (error || !data) return [];

    const normalizedRoles = (data || [])
      .map((row) => String(row.role || "").trim().toLowerCase())
      .filter((role): role is AppRole =>
        ["admin", "teacher", "parent", "bursar", "librarian", "system_admin"].includes(role as AppRole)
      );

    return Array.from(new Set(normalizedRoles));
  };

  const resolvePrimaryRole = (roles: AppRole[]): AppRole | null => {
    if (roles.includes("system_admin")) return "system_admin";
    if (roles.includes("admin")) return "admin";
    if (roles.includes("teacher")) return "teacher";
    if (roles.includes("parent")) return "parent";
    if (roles.includes("bursar")) return "bursar";
    if (roles.includes("librarian")) return "librarian";
    return null;
  };

  const fetchUserProfile = async (userId: string, email: string): Promise<AuthUser | null> => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", userId)
      .maybeSingle();

    let roles = await fetchUserRoles(userId);
    
    // Admins are also treated as teachers of their school
    if (roles.includes("admin") && !roles.includes("teacher")) {
      roles = [...roles, "teacher"];
    }
    
    const role = resolvePrimaryRole(roles);

    return {
      id: userId,
      email,
      fullName: profile?.full_name || email,
      role,
      roles,
    };
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        
        if (session?.user) {
          // Use setTimeout to avoid blocking the auth state change
          setTimeout(async () => {
            const authUser = await fetchUserProfile(session.user.id, session.user.email || "");
            setUser(authUser);
            setLoading(false);
          }, 0);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        const authUser = await fetchUserProfile(session.user.id, session.user.email || "");
        setUser(authUser);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName },
      },
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  useEffect(() => {
    if (!session) return;

    const inactivityMs = 30 * 60 * 1000;
    let timeoutId: number | undefined;

    const resetTimer = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(async () => {
        await signOut();
        navigate("/login", { replace: true });
      }, inactivityMs);
    };

    const activityEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ] as const;

    activityEvents.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      activityEvents.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [navigate, session, signOut]);

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
