import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Calendar,
  ClipboardCheck,
  FileText,
  CreditCard,
  Bell,
  Settings,
  LogOut,
  BookOpen,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigationItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Students", href: "/students", icon: Users },
  { name: "Classes", href: "/classes", icon: GraduationCap },
  { name: "Attendance", href: "/attendance", icon: UserCheck },
  { name: "Assessments", href: "/assessments", icon: ClipboardCheck },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Fees", href: "/fees", icon: CreditCard },
  { name: "Parents", href: "/parents", icon: BookOpen },
  { name: "Notices", href: "/notices", icon: Bell },
];

const bottomItems = [
  { name: "Settings", href: "/settings", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
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
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
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
        {bottomItems.map((item) => (
          <Link
            key={item.name}
            to={item.href}
            className={cn(
              "nav-item",
              location.pathname === item.href && "active"
            )}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{item.name}</span>
          </Link>
        ))}
        <button className="nav-item w-full text-left hover:text-destructive">
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">Sign Out</span>
        </button>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center">
            <span className="text-sm font-medium text-sidebar-foreground">JK</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">John Kamau</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">Administrator</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
