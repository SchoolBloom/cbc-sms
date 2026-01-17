import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Classes from "./pages/Classes";
import Attendance from "./pages/Attendance";
import Assessments from "./pages/Assessments";
import Fees from "./pages/Fees";
import Parents from "./pages/Parents";
import Notices from "./pages/Notices";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/students" element={<Students />} />
          <Route path="/classes" element={<Classes />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/assessments" element={<Assessments />} />
          <Route path="/fees" element={<Fees />} />
          <Route path="/parents" element={<Parents />} />
          <Route path="/notices" element={<Notices />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
