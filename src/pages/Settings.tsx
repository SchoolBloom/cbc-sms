import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Building2, Calendar, Users, Shield, Bell, Database } from "lucide-react";

export default function Settings() {
  return (
    <DashboardLayout>
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title font-display">Settings</h1>
        <p className="page-subtitle">Manage school and system settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-xl border border-border/50 p-4">
            <nav className="space-y-1">
              {[
                { name: "School Profile", icon: Building2, active: true },
                { name: "Academic Year", icon: Calendar, active: false },
                { name: "User Management", icon: Users, active: false },
                { name: "Security", icon: Shield, active: false },
                { name: "Notifications", icon: Bell, active: false },
                { name: "Backup & Data", icon: Database, active: false },
              ].map((item) => (
                <button
                  key={item.name}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    item.active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-xl border border-border/50 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-foreground">School Profile</h2>
                <p className="text-sm text-muted-foreground">Basic school information</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="schoolName">School Name</Label>
                  <Input id="schoolName" defaultValue="Sunrise Primary School" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schoolCode">School Code</Label>
                  <Input id="schoolCode" defaultValue="10001234" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="county">County</Label>
                  <Input id="county" defaultValue="Nairobi" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subcounty">Sub-County</Label>
                  <Input id="subcounty" defaultValue="Westlands" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Physical Address</Label>
                <Input id="address" defaultValue="P.O. Box 12345 - 00100, Nairobi" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" defaultValue="+254 20 123 4567" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" defaultValue="info@sunriseprimary.sc.ke" />
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-medium text-foreground mb-4">Head Teacher Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="headteacher">Head Teacher Name</Label>
                    <Input id="headteacher" defaultValue="Mrs. Jane Wanjiku Kariuki" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="htPhone">Phone Number</Label>
                    <Input id="htPhone" defaultValue="+254 712 345 678" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline">Cancel</Button>
                <Button>Save Changes</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
