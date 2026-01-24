import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpenCheck,
  ClipboardCheck,
  FileText,
  CreditCard,
  Bell,
  Settings,
  LogOut,
  BookOpen,
  UserCheck,
  UserRound,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  roles: ("admin" | "teacher" | "parent" | "bursar")[];
}

const navigationItems: NavItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["admin", "teacher", "parent", "bursar"] },
  { name: "Students", href: "/students", icon: Users, roles: ["admin", "teacher"] },
  { name: "Classes", href: "/classes", icon: GraduationCap, roles: ["admin", "teacher"] },
  { name: "Subjects", href: "/subjects", icon: BookOpenCheck, roles: ["admin"] },
  { name: "Attendance", href: "/attendance", icon: UserCheck, roles: ["admin", "teacher", "parent"] },
  { name: "Assessments", href: "/assessments", icon: ClipboardCheck, roles: ["admin", "teacher", "parent"] },
  { name: "Reports", href: "/reports", icon: FileText, roles: ["admin", "teacher", "parent", "bursar"] },
  { name: "Fees", href: "/fees", icon: CreditCard, roles: ["admin", "parent", "bursar"] },
  { name: "Parents", href: "/parents", icon: BookOpen, roles: ["admin", "teacher", "bursar"] },
  { name: "Teachers", href: "/teachers", icon: UserRound, roles: ["admin"] },
  { name: "Notices", href: "/notices", icon: Bell, roles: ["admin", "teacher", "parent"] },
  { name: "Calendar", href: "/calendar", icon: Calendar, roles: ["admin", "teacher", "parent", "bursar"] },
];

const bottomItems: NavItem[] = [
  { name: "Settings", href: "/settings", icon: Settings, roles: ["admin"] },
];

const roleLabels: Record<string, string> = {
  admin: "Administrator",
  teacher: "Teacher",
  parent: "Parent",
  bursar: "Bursar",
};

const roleColors: Record<string, string> = {
  admin: "bg-primary text-primary-foreground",
  teacher: "bg-success text-success-foreground",
  parent: "bg-accent text-accent-foreground",
  bursar: "bg-info text-info-foreground",
};

interface AppSidebarContentProps {
  onNavigate?: () => void;
}

export function AppSidebarContent({ onNavigate }: AppSidebarContentProps) {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const userRole = user?.role || "teacher";

  const visibleNavItems = navigationItems.filter((item) =>
    item.roles.includes(userRole)
  );

  const visibleBottomItems = bottomItems.filter((item) =>
    item.roles.includes(userRole)
  );

  const handleSignOut = async () => {
    await signOut();
    onNavigate?.();
  };

  return (
    <div className="flex h-full w-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center">
          <GraduationCap className="w-6 h-6 text-sidebar-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display font-bold text-lg text-sidebar-foreground">Shule SMS</h1>
          <p className="text-xs text-sidebar-foreground/60">School Management</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onNavigate}
              className={cn(
                "nav-item",
                isActive && "active"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        {visibleBottomItems.map((item) => (
          <Link
            key={item.name}
            to={item.href}
            onClick={onNavigate}
            className={cn(
              "nav-item",
              location.pathname === item.href && "active"
            )}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{item.name}</span>
          </Link>
        ))}
        <button 
          onClick={handleSignOut}
          className="nav-item w-full text-left hover:text-destructive"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">Sign Out</span>
        </button>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center">
            <span className="text-sm font-medium text-sidebar-foreground">
              {user?.fullName?.split(" ").map((n) => n[0]).join("").slice(0, 2) || "U"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.fullName || "User"}</p>
            <Badge className={cn("text-[10px] px-1.5 py-0", roleColors[userRole])}>
              {roleLabels[userRole]}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppSidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 bg-sidebar border-r border-sidebar-border md:flex">
      <AppSidebarContent />
    </aside>
  );
}
