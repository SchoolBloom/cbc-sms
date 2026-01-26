import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Building2, Calendar, Users, Shield, Bell, Database, Loader2 } from "lucide-react";
import { useAcademicYear, useUpsertAcademicYear } from "@/hooks/useAcademicYear";
import { AssignBursarDialog } from "@/components/users/AssignBursarDialog";

export default function Settings() {
  const [activeSection, setActiveSection] = useState("School Profile");
  const { data: academicYear, isLoading: academicYearLoading } = useAcademicYear();
  const updateAcademicYear = useUpsertAcademicYear();
  const [yearForm, setYearForm] = useState({
    id: "",
    label: "",
    start_date: "",
    end_date: "",
    current_term: "1",
    term1_start: "",
    term1_end: "",
    term2_start: "",
    term2_end: "",
    term3_start: "",
    term3_end: "",
    is_current: true,
  });

  useEffect(() => {
    if (!academicYear) return;
    setYearForm({
      id: academicYear.id,
      label: academicYear.label,
      start_date: academicYear.start_date,
      end_date: academicYear.end_date,
      current_term: academicYear.current_term.toString(),
      term1_start: academicYear.term1_start || "",
      term1_end: academicYear.term1_end || "",
      term2_start: academicYear.term2_start || "",
      term2_end: academicYear.term2_end || "",
      term3_start: academicYear.term3_start || "",
      term3_end: academicYear.term3_end || "",
      is_current: academicYear.is_current,
    });
  }, [academicYear]);

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
                  onClick={() => setActiveSection(item.name)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    activeSection === item.name
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
          {activeSection === "School Profile" && (
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
                    <Input id="schoolName" defaultValue="Sanaet Education Centre" disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="schoolCode">School Code</Label>
                    <Input id="schoolCode" defaultValue="31545239" disabled />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="county">County</Label>
                    <Input id="county" defaultValue="Kajiado" disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subcounty">Sub-County</Label>
                    <Input id="subcounty" defaultValue="Loitokitok" disabled />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Physical Address</Label>
                  <Input id="address" defaultValue="P.O. Box 77 - 00209 Loitokitok" disabled />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" defaultValue="+254 720 958 989" disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" defaultValue="sanaeteducentre@gmail.com" disabled />
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium text-foreground mb-4">Head Teacher Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="headteacher">Head Teacher Name</Label>
                      <Input id="headteacher" defaultValue="Mr Sanaet Memusi" disabled />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="htPhone">Phone Number</Label>
                      <Input id="htPhone" defaultValue="+254 798 131 855" disabled />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeSection === "Academic Year" && (
            <div className="bg-card rounded-xl border border-border/50 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display font-semibold text-foreground">Academic Year</h2>
                  <p className="text-sm text-muted-foreground">Manage term dates and academic year settings</p>
                </div>
              </div>
              {academicYearLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading academic year...
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="yearLabel">Academic Year Label</Label>
                      <Input
                        id="yearLabel"
                        value={yearForm.label}
                        onChange={(e) => setYearForm((prev) => ({ ...prev, label: e.target.value }))}
                        placeholder="2024"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currentTerm">Current Term</Label>
                      <Input
                        id="currentTerm"
                        type="number"
                        min={1}
                        max={3}
                        value={yearForm.current_term}
                        onChange={(e) => setYearForm((prev) => ({ ...prev, current_term: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="yearStart">Year Start</Label>
                      <Input
                        id="yearStart"
                        type="date"
                        value={yearForm.start_date}
                        onChange={(e) => setYearForm((prev) => ({ ...prev, start_date: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="yearEnd">Year End</Label>
                      <Input
                        id="yearEnd"
                        type="date"
                        value={yearForm.end_date}
                        onChange={(e) => setYearForm((prev) => ({ ...prev, end_date: e.target.value }))}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-medium text-foreground mb-4">Term 1</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="term1Start">Start</Label>
                        <Input
                          id="term1Start"
                          type="date"
                          value={yearForm.term1_start}
                          onChange={(e) => setYearForm((prev) => ({ ...prev, term1_start: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="term1End">End</Label>
                        <Input
                          id="term1End"
                          type="date"
                          value={yearForm.term1_end}
                          onChange={(e) => setYearForm((prev) => ({ ...prev, term1_end: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-foreground mb-4">Term 2</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="term2Start">Start</Label>
                        <Input
                          id="term2Start"
                          type="date"
                          value={yearForm.term2_start}
                          onChange={(e) => setYearForm((prev) => ({ ...prev, term2_start: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="term2End">End</Label>
                        <Input
                          id="term2End"
                          type="date"
                          value={yearForm.term2_end}
                          onChange={(e) => setYearForm((prev) => ({ ...prev, term2_end: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-foreground mb-4">Term 3</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="term3Start">Start</Label>
                        <Input
                          id="term3Start"
                          type="date"
                          value={yearForm.term3_start}
                          onChange={(e) => setYearForm((prev) => ({ ...prev, term3_start: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="term3End">End</Label>
                        <Input
                          id="term3End"
                          type="date"
                          value={yearForm.term3_end}
                          onChange={(e) => setYearForm((prev) => ({ ...prev, term3_end: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                    <div>
                      <Label>Set as current academic year</Label>
                      <p className="text-xs text-muted-foreground">Only one academic year should be active.</p>
                    </div>
                    <Switch
                      checked={yearForm.is_current}
                      onCheckedChange={(checked) => setYearForm((prev) => ({ ...prev, is_current: checked }))}
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="outline">Cancel</Button>
                    <Button
                      disabled={updateAcademicYear.isPending || !yearForm.label || !yearForm.start_date || !yearForm.end_date}
                      onClick={() =>
                        updateAcademicYear.mutate({
                          id: yearForm.id,
                          label: yearForm.label.trim(),
                          start_date: yearForm.start_date,
                          end_date: yearForm.end_date,
                          current_term: Number(yearForm.current_term),
                          term1_start: yearForm.term1_start || null,
                          term1_end: yearForm.term1_end || null,
                          term2_start: yearForm.term2_start || null,
                          term2_end: yearForm.term2_end || null,
                          term3_start: yearForm.term3_start || null,
                          term3_end: yearForm.term3_end || null,
                          is_current: yearForm.is_current,
                        })
                      }
                    >
                      {updateAcademicYear.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === "User Management" && (
            <div className="bg-card rounded-xl border border-border/50 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display font-semibold text-foreground">User Management</h2>
                  <p className="text-sm text-muted-foreground">
                    Assign roles after users create their accounts.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-border/50 p-4">
                  <div>
                    <p className="font-medium text-foreground">Bursar Access</p>
                    <p className="text-sm text-muted-foreground">
                      Grant the Bursar role to a user who has already signed up.
                    </p>
                  </div>
                  <AssignBursarDialog />
                </div>
                <div className="rounded-lg border border-border/50 p-4 text-sm text-muted-foreground">
                  Use the Teachers and Parents pages to grant access for those roles.
                </div>
              </div>
            </div>
          )}

          {activeSection === "User Management" && (
            <div className="bg-card rounded-xl border border-border/50 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display font-semibold text-foreground">User Management</h2>
                  <p className="text-sm text-muted-foreground">Manage staff roles and access</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Coming soon.</p>
            </div>
          )}

          {activeSection === "Security" && (
            <div className="bg-card rounded-xl border border-border/50 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display font-semibold text-foreground">Security</h2>
                  <p className="text-sm text-muted-foreground">Manage security and access policies</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Coming soon.</p>
            </div>
          )}

          {activeSection === "Notifications" && (
            <div className="bg-card rounded-xl border border-border/50 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display font-semibold text-foreground">Notifications</h2>
                  <p className="text-sm text-muted-foreground">Manage notification channels and alerts</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Coming soon.</p>
            </div>
          )}

          {activeSection === "Backup & Data" && (
            <div className="bg-card rounded-xl border border-border/50 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Database className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display font-semibold text-foreground">Backup & Data</h2>
                  <p className="text-sm text-muted-foreground">Manage exports and backups</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Coming soon.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
