import { Link } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AwaitingAllocation() {
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
          <Button asChild>
            <Link to="/login">Back to login</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
