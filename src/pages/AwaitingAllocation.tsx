import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface DiagnosticData {
  userId: string;
  email: string;
  profile: any;
  userRoles: any[];
  teachersByEmail: any[];
  parentsByEmail: any[];
}

export default function AwaitingAllocation() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [diagnostics, setDiagnostics] = useState<DiagnosticData | null>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);

  const handleBackToLogin = async () => {
    await signOut();
    navigate("/login");
  };

  useEffect(() => {
    if (user?.role) {
      navigate("/", { replace: true });
    }
  }, [navigate, user?.role]);

  useEffect(() => {
    if (!user) return;

    const runDiagnostics = async () => {
      setLoadingDiagnostics(true);
      try {
        const [
          { data: profile },
          { data: userRoles },
          { data: teachersByEmail },
          { data: parentsByEmail },
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("user_roles")
            .select("*")
            .eq("user_id", user.id),
          supabase
            .from("teachers")
            .select("*")
            .ilike("email", user.email || ""),
          supabase
            .from("parents")
            .select("*")
            .ilike("email", user.email || ""),
        ]);

        setDiagnostics({
          userId: user.id,
          email: user.email || "",
          profile,
          userRoles: userRoles || [],
          teachersByEmail: teachersByEmail || [],
          parentsByEmail: parentsByEmail || [],
        });
      } catch (err) {
        console.error("Diagnostics failed:", err);
      } finally {
        setLoadingDiagnostics(false);
      }
    };

    runDiagnostics();
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex flex-col items-center justify-center p-4 gap-6">
      <div className="w-full max-w-lg text-center bg-card border border-border p-8 rounded-2xl shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
          <GraduationCap className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold font-display text-foreground">
          Account created
        </h1>
        <p className="mt-3 text-muted-foreground">
          Your account is ready, but access needs to be allocated by an
          administrator. Please contact your school admin to assign your role.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <Button onClick={handleBackToLogin}>Back to login</Button>
        </div>
      </div>

      {diagnostics && (
        <div className="w-full max-w-lg bg-card border border-border/80 p-6 rounded-xl shadow-md text-left text-sm">
          <div className="flex items-center gap-2 mb-4 font-semibold text-foreground border-b border-border/50 pb-2">
            <Info className="w-4 h-4 text-primary" />
            <span>Account Diagnosis Info</span>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-muted-foreground block text-xs">User ID / Email</span>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-foreground block truncate">
                {diagnostics.userId} ({diagnostics.email})
              </code>
            </div>

            <div>
              <span className="text-muted-foreground block text-xs mb-1">Profile State</span>
              {diagnostics.profile ? (
                <div className="flex items-center gap-1.5 text-green-600 font-medium text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Profile exists (School ID: {diagnostics.profile.school_id || "None"})</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-amber-600 font-medium text-xs">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Profile missing in profiles table</span>
                </div>
              )}
            </div>

            <div>
              <span className="text-muted-foreground block text-xs mb-1">Assigned Roles (user_roles table)</span>
              {diagnostics.userRoles.length > 0 ? (
                <div className="space-y-1">
                  {diagnostics.userRoles.map((r, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-green-600 font-medium text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Role "{r.role}" (School ID: {r.school_id || "None"})</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-amber-600 font-medium text-xs">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>No roles assigned</span>
                </div>
              )}
            </div>

            <div>
              <span className="text-muted-foreground block text-xs mb-1">Pre-registered Teacher Record</span>
              {diagnostics.teachersByEmail.length > 0 ? (
                <div className="space-y-1">
                  {diagnostics.teachersByEmail.map((t, i) => (
                    <div key={i} className="flex flex-col gap-0.5 p-2 bg-muted/50 rounded border border-border/30 text-xs">
                      <div className="flex items-center gap-1.5 text-green-600 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Teacher match found (ID: {t.id})</span>
                      </div>
                      <div className="pl-5 text-[11px] text-muted-foreground space-y-0.5">
                        <p>Linked User ID: <code className="bg-muted px-1 rounded">{t.user_id || "NULL (Unlinked)"}</code></p>
                        <p>School ID: <code className="bg-muted px-1 rounded">{t.school_id || "None"}</code></p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-amber-600 font-medium text-xs">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>No matching teacher record found by email</span>
                </div>
              )}
            </div>

            <div>
              <span className="text-muted-foreground block text-xs mb-1">Pre-registered Parent Record</span>
              {diagnostics.parentsByEmail.length > 0 ? (
                <div className="space-y-1">
                  {diagnostics.parentsByEmail.map((p, i) => (
                    <div key={i} className="flex flex-col gap-0.5 p-2 bg-muted/50 rounded border border-border/30 text-xs">
                      <div className="flex items-center gap-1.5 text-green-600 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Parent match found (ID: {p.id})</span>
                      </div>
                      <div className="pl-5 text-[11px] text-muted-foreground space-y-0.5">
                        <p>Linked User ID: <code className="bg-muted px-1 rounded">{p.user_id || "NULL (Unlinked)"}</code></p>
                        <p>School ID: <code className="bg-muted px-1 rounded">{p.school_id || "None"}</code></p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                  <Info className="w-3.5 h-3.5 text-muted-foreground/70" />
                  <span>No parent record found by email</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
