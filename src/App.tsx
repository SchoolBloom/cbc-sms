import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { RoleProvider } from "@/contexts/RoleContext";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Classes from "./pages/Classes";
import Attendance from "./pages/Attendance";
import Assessments from "./pages/Assessments";
import Fees from "./pages/Fees";
import Parents from "./pages/Parents";
import Teachers from "./pages/Teachers";
import Notices from "./pages/Notices";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Subjects from "./pages/Subjects";
import Login from "./pages/Login";
import AwaitingAllocation from "./pages/AwaitingAllocation";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

type AppRole = "admin" | "teacher" | "parent" | "bursar";

const roleDefaultRoutes: Record<AppRole, string> = {
  admin: "/",
  teacher: "/",
  parent: "/",
  bursar: "/fees",
};

function getDefaultRoute(role: AppRole | null | undefined) {
  if (!role) return "/awaiting-allocation";
  return roleDefaultRoutes[role];
}

function RoleProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && (!user.role || !allowedRoles.includes(user.role))) {
    return <Navigate to={getDefaultRoute(user.role)} replace />;
  }

  return <>{children}</>;
}

function RoleHome() {
  const { user } = useAuth();
  const defaultRoute = getDefaultRoute(user?.role);

  if (defaultRoute !== "/") {
    return <Navigate to={defaultRoute} replace />;
  }

  return <Dashboard />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (user) {
    return <Navigate to={getDefaultRoute(user.role)} replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/awaiting-allocation" element={<AwaitingAllocation />} />
      <Route path="/" element={<ProtectedRoute><RoleHome /></ProtectedRoute>} />
      <Route path="/students" element={<RoleProtectedRoute allowedRoles={["admin", "teacher"]}><Students /></RoleProtectedRoute>} />
      <Route path="/classes" element={<RoleProtectedRoute allowedRoles={["admin", "teacher"]}><Classes /></RoleProtectedRoute>} />
      <Route path="/attendance" element={<RoleProtectedRoute allowedRoles={["admin", "teacher", "parent"]}><Attendance /></RoleProtectedRoute>} />
      <Route path="/assessments" element={<RoleProtectedRoute allowedRoles={["admin", "teacher", "parent"]}><Assessments /></RoleProtectedRoute>} />
      <Route path="/fees" element={<RoleProtectedRoute allowedRoles={["admin", "parent", "bursar"]}><Fees /></RoleProtectedRoute>} />
      <Route path="/parents" element={<RoleProtectedRoute allowedRoles={["admin", "teacher", "bursar"]}><Parents /></RoleProtectedRoute>} />
      <Route path="/teachers" element={<RoleProtectedRoute allowedRoles={["admin"]}><Teachers /></RoleProtectedRoute>} />
      <Route path="/notices" element={<RoleProtectedRoute allowedRoles={["admin", "teacher", "parent"]}><Notices /></RoleProtectedRoute>} />
      <Route path="/reports" element={<RoleProtectedRoute allowedRoles={["admin", "teacher", "parent", "bursar"]}><Reports /></RoleProtectedRoute>} />
      <Route path="/subjects" element={<RoleProtectedRoute allowedRoles={["admin"]}><Subjects /></RoleProtectedRoute>} />
      <Route path="/settings" element={<RoleProtectedRoute allowedRoles={["admin"]}><Settings /></RoleProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <RoleProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppRoutes />
          </TooltipProvider>
        </RoleProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
