import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function AwaitingAllocation() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  const handleBackToLogin = async () => {
    await signOut();
    navigate("/login");
  };

  useEffect(() => {
    if (user?.role) {
      navigate("/", { replace: true });
    }
  }, [navigate, user?.role]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-lg text-center">
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
        <div className="mt-6">
          <Button onClick={handleBackToLogin}>Back to login</Button>
        </div>
      </div>
    </div>
  );
}
