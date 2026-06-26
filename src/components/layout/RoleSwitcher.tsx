import { useRole, getRoleLabel, UserRole } from "@/contexts/RoleContext";
import { Button } from "@/components/ui/button";
import { ChevronDown, Shield, BookOpen, Users } from "lucide-react";

const roleIcons: Record<UserRole, typeof Shield> = {
  admin: Shield,
  teacher: BookOpen,
  parent: Users,
  system_admin: Shield,
};

export function RoleSwitcher() {
  const { user } = useRole();
  const RoleIcon = roleIcons[user.role];

  return (
    <Button variant="outline" size="sm" className="gap-2 h-9" disabled>
      <RoleIcon className="w-4 h-4" />
      <span className="hidden sm:inline">{getRoleLabel(user.role)}</span>
      <ChevronDown className="w-3 h-3" />
    </Button>
  );
}
