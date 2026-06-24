import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export type UserRole = "admin" | "teacher" | "parent" | "bursar" | "librarian" | "system_admin";

interface RoleUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  // For parents
  childrenIds?: string[];
  children?: {
    id: string;
    full_name: string;
    admission_number: string;
    assessment_number?: string | null;
    status: string;
    classes: {
      grade: string;
      stream: string;
    } | null;
  }[];
}

interface RoleContextType {
  user: RoleUser | null;
  setUser: (user: RoleUser | null) => void;
  selectedChildId: string | null;
  setSelectedChildId: (childId: string | null) => void;
  hasPermission: (permission: Permission) => boolean;
}

type Permission = 
  | "students:read" | "students:write" | "students:delete"
  | "classes:read" | "classes:write"
  | "attendance:read" | "attendance:write"
  | "assessments:read" | "assessments:write" | "assessments:approve"
  | "fees:read" | "fees:write" | "fees:collect"
  | "library:read" | "library:write" | "library:manage"
  | "parents:read" | "parents:write"
  | "notices:read" | "notices:write" | "notices:publish"
  | "reports:read" | "reports:generate"
  | "settings:read" | "settings:write"
  | "system:read" | "system:write"
  | "timetables:read" | "timetables:write";

const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    "students:read", "students:write", "students:delete",
    "classes:read", "classes:write",
    "attendance:read", "attendance:write",
    "assessments:read", "assessments:write", "assessments:approve",
    "fees:read", "fees:write", "fees:collect",
    "library:read", "library:write", "library:manage",
    "parents:read", "parents:write",
    "notices:read", "notices:write", "notices:publish",
    "reports:read", "reports:generate",
    "settings:read", "settings:write",
    "timetables:read", "timetables:write",
  ],
  teacher: [
    "students:read",
    "classes:read",
    "attendance:read", "attendance:write",
    "assessments:read", "assessments:write",
    "library:read", "library:write",
    "parents:read",
    "notices:read",
    "reports:read",
    "timetables:read",
  ],
  parent: [
    "students:read",
    "attendance:read",
    "assessments:read",
    "fees:read",
    "library:read",
    "notices:read",
    "reports:read",
  ],
  bursar: [
    "students:read",
    "fees:read", "fees:write", "fees:collect",
    "parents:read",
    "reports:read", "reports:generate",
  ],
  librarian: [
    "students:read",
    "library:read", "library:write", "library:manage",
    "reports:read", "reports:generate",
    "settings:read",
  ],
  system_admin: [
    "settings:read", "settings:write",
    "reports:read",
    "system:read", "system:write",
  ],
};

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState<RoleUser | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const syncUser = async () => {
      if (!authUser) {
        setUser(null);
        setSelectedChildId(null);
        return;
      }

      if (!authUser.role) {
        setUser(null);
        setSelectedChildId(null);
        return;
      }

      let nextUser: RoleUser = {
        id: authUser.id,
        name: authUser.fullName,
        email: authUser.email,
        role: authUser.role,
      };

      if (isActive) {
        setUser(nextUser);
      }

      if (authUser.role === "parent") {
        const { data: parentByUserId } = await supabase
          .from("parents")
          .select("id, full_name, phone, email, user_id")
          .eq("user_id", authUser.id)
          .maybeSingle();

        let parentRecord = parentByUserId;

        if (!parentRecord && authUser.email) {
          const { data: parentByEmail } = await supabase
            .from("parents")
            .select("id, full_name, phone, email, user_id")
            .eq("email", authUser.email)
            .maybeSingle();

          parentRecord = parentByEmail ?? null;

          if (parentRecord && parentRecord.user_id !== authUser.id) {
            await supabase
              .from("parents")
              .update({ user_id: authUser.id })
              .eq("id", parentRecord.id);
            parentRecord = { ...parentRecord, user_id: authUser.id };
          }
        }

        if (parentRecord) {
          const { data: children } = await supabase
            .from("learners")
            .select("id, full_name, admission_number, assessment_number, status, classes:class_id (grade, stream)")
            .or(`parent_id.eq.${parentRecord.id},parent_id_secondary.eq.${parentRecord.id}`)
            .order("full_name");

          const childIds = children?.map((child) => child.id) || [];

          nextUser = {
            ...nextUser,
            name: parentRecord.full_name || nextUser.name,
            email: parentRecord.email || nextUser.email,
            childrenIds: childIds,
            children: children || [],
          };

          if (isActive) {
            setSelectedChildId((prev) => (prev && childIds.includes(prev) ? prev : childIds[0] || null));
          }
        } else {
          nextUser = { ...nextUser, childrenIds: [], children: [] };
          if (isActive) {
            setSelectedChildId(null);
          }
        }
      } else if (isActive) {
        setSelectedChildId(null);
      }

      if (isActive) {
        setUser(nextUser);
      }
    };

    syncUser();

    return () => {
      isActive = false;
    };
  }, [authUser]);

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    return rolePermissions[user.role].includes(permission);
  };

  if (authUser?.role && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <RoleContext.Provider value={{ user, setUser, selectedChildId, setSelectedChildId, hasPermission }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context || !context.user) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    admin: "Administrator",
    teacher: "Teacher",
    parent: "Parent/Guardian",
    bursar: "Accounts/Bursar",
    librarian: "Librarian",
    system_admin: "System Admin",
  };
  return labels[role];
}

export function getRoleColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    admin: "bg-primary text-primary-foreground",
    teacher: "bg-info text-info-foreground",
    parent: "bg-success text-success-foreground",
    bursar: "bg-accent text-accent-foreground",
    librarian: "bg-secondary text-secondary-foreground",
    system_admin: "bg-warning text-warning-foreground",
  };
  return colors[role];
}
