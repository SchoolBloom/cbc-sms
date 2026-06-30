import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth, type AppRole } from "@/contexts/AuthContext";
import { RoleProvider } from "@/contexts/RoleContext";
import Dashboard from "./pages/Dashboard";
import Learners from "./pages/Learners";
import Classes from "./pages/Classes";
import Assessments from "./pages/Assessments";
import Parents from "./pages/Parents";
import Teachers from "./pages/Teachers";
import Pathways from "./pages/Pathways";
import SBATasks from "./pages/SBATasks";
import PlatformSchools from "./pages/PlatformSchools";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import AwaitingAllocation from "./pages/AwaitingAllocation";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

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

const roleDefaultRoutes: Record<AppRole, string> = {
  admin: "/",
  teacher: "/",
  parent: "/",
  system_admin: "/",
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

  if (!user?.role) {
    return <Navigate to="/awaiting-allocation" replace />;
  }

  const defaultRoute = getDefaultRoute(user.role);

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
      <Route path="/platform/schools" element={<RoleProtectedRoute allowedRoles={["system_admin"]}><PlatformSchools /></RoleProtectedRoute>} />
      <Route path="/learners" element={<RoleProtectedRoute allowedRoles={["admin"]}><Learners /></RoleProtectedRoute>} />
      <Route path="/classes" element={<RoleProtectedRoute allowedRoles={["admin", "teacher"]}><Classes /></RoleProtectedRoute>} />
      <Route path="/sba-tasks" element={<RoleProtectedRoute allowedRoles={["admin"]}><SBATasks /></RoleProtectedRoute>} />
      <Route path="/assessments" element={<RoleProtectedRoute allowedRoles={["admin", "teacher", "parent"]}><Assessments /></RoleProtectedRoute>} />
      <Route path="/parents" element={<RoleProtectedRoute allowedRoles={["admin"]}><Parents /></RoleProtectedRoute>} />
      <Route path="/teachers" element={<RoleProtectedRoute allowedRoles={["admin"]}><Teachers /></RoleProtectedRoute>} />
      <Route path="/pathways" element={<RoleProtectedRoute allowedRoles={["admin", "parent"]}><Pathways /></RoleProtectedRoute>} />
      <Route path="/settings" element={<RoleProtectedRoute allowedRoles={["admin", "teacher", "parent", "system_admin"]}><Settings /></RoleProtectedRoute>} />
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
