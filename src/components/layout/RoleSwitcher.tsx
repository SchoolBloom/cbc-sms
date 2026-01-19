import { useRole, getRoleLabel, getRoleColor, UserRole } from "@/contexts/RoleContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Shield, BookOpen, Users, Wallet } from "lucide-react";

const roleIcons: Record<UserRole, typeof Shield> = {
  admin: Shield,
  teacher: BookOpen,
  parent: Users,
  bursar: Wallet,
};

export function RoleSwitcher() {
  const { user, switchRole } = useRole();
  const RoleIcon = roleIcons[user.role];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-9">
          <RoleIcon className="w-4 h-4" />
          <span className="hidden sm:inline">{getRoleLabel(user.role)}</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            Demo
          </Badge>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Switch Role (Demo)</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(["admin", "teacher", "parent", "bursar"] as UserRole[]).map((role) => {
          const Icon = roleIcons[role];
          const isActive = user.role === role;
          return (
            <DropdownMenuItem
              key={role}
              onClick={() => switchRole(role)}
              className={isActive ? "bg-muted" : ""}
            >
              <Icon className="w-4 h-4 mr-2" />
              <span className="flex-1">{getRoleLabel(role)}</span>
              {isActive && (
                <Badge className={getRoleColor(role)} variant="secondary">
                  Active
                </Badge>
              )}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <div className="px-2 py-2 text-xs text-muted-foreground">
          Switch roles to preview different user experiences
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
