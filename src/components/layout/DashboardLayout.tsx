import { useState } from "react";
import { AppSidebar, AppSidebarContent } from "./AppSidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar p-0 text-sidebar-foreground">
          <AppSidebarContent onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>
      <main className="md:pl-64">
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur md:hidden">
          <Button variant="outline" size="icon" onClick={() => setMobileNavOpen(true)}>
            <Menu className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold text-foreground">Shule SMS</span>
          <div className="h-9 w-9" />
        </div>
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
