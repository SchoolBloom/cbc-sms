import { createContext, useContext, useState, ReactNode } from "react";

export type UserRole = "admin" | "teacher" | "parent" | "bursar";

interface RoleUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  // For teachers
  assignedClasses?: string[];
  // For parents
  childrenIds?: string[];
}

interface RoleContextType {
  user: RoleUser;
  setUser: (user: RoleUser) => void;
  switchRole: (role: UserRole) => void;
  hasPermission: (permission: Permission) => boolean;
}

type Permission = 
  | "students:read" | "students:write" | "students:delete"
  | "classes:read" | "classes:write"
  | "attendance:read" | "attendance:write"
  | "assessments:read" | "assessments:write" | "assessments:approve"
  | "fees:read" | "fees:write" | "fees:collect"
  | "parents:read" | "parents:write"
  | "notices:read" | "notices:write" | "notices:publish"
  | "reports:read" | "reports:generate"
  | "settings:read" | "settings:write";

const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    "students:read", "students:write", "students:delete",
    "classes:read", "classes:write",
    "attendance:read", "attendance:write",
    "assessments:read", "assessments:write", "assessments:approve",
    "fees:read", "fees:write", "fees:collect",
    "parents:read", "parents:write",
    "notices:read", "notices:write", "notices:publish",
    "reports:read", "reports:generate",
    "settings:read", "settings:write",
  ],
  teacher: [
    "students:read",
    "classes:read",
    "attendance:read", "attendance:write",
    "assessments:read", "assessments:write",
    "parents:read",
    "notices:read",
    "reports:read",
  ],
  parent: [
    "students:read",
    "attendance:read",
    "assessments:read",
    "fees:read",
    "notices:read",
    "reports:read",
  ],
  bursar: [
    "students:read",
    "fees:read", "fees:write", "fees:collect",
    "parents:read",
    "reports:read", "reports:generate",
  ],
};

const demoUsers: Record<UserRole, RoleUser> = {
  admin: {
    id: "admin-1",
    name: "John Kamau",
    email: "admin@sunriseprimary.sc.ke",
    role: "admin",
  },
  teacher: {
    id: "teacher-1",
    name: "Ms. Grace Wanjiru",
    email: "grace.wanjiru@sunriseprimary.sc.ke",
    role: "teacher",
    assignedClasses: ["4A", "4B"],
  },
  parent: {
    id: "parent-1",
    name: "Mary Kamau",
    email: "mary.kamau@email.com",
    role: "parent",
    childrenIds: ["student-1"],
  },
  bursar: {
    id: "bursar-1",
    name: "Mr. Peter Omondi",
    email: "bursar@sunriseprimary.sc.ke",
    role: "bursar",
  },
};

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<RoleUser>(demoUsers.admin);

  const switchRole = (role: UserRole) => {
    setUser(demoUsers[role]);
  };

  const hasPermission = (permission: Permission): boolean => {
    return rolePermissions[user.role].includes(permission);
  };

  return (
    <RoleContext.Provider value={{ user, setUser, switchRole, hasPermission }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
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
  };
  return labels[role];
}

export function getRoleColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    admin: "bg-primary text-primary-foreground",
    teacher: "bg-info text-info-foreground",
    parent: "bg-success text-success-foreground",
    bursar: "bg-accent text-accent-foreground",
  };
  return colors[role];
}
