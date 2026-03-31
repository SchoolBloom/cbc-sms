import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AssignBursarDialog } from "@/components/users/AssignBursarDialog";
import { AssignLibrarianDialog } from "@/components/users/AssignLibrarianDialog";
import { useAcademicYear, useUpsertAcademicYear } from "@/hooks/useAcademicYear";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { getSchoolCategoryLabel } from "@/lib/schoolCategories";
import {
  Bell,
  BookUser,
  Building2,
  Calendar,
  Database,
  Loader2,
  ServerCog,
  Shield,
  Users,
} from "lucide-react";

const adminSections = [
  { name: "School Profile", icon: Building2 },
  { name: "Academic Year", icon: Calendar },
  { name: "User Management", icon: Users },
  { name: "Security", icon: Shield },
  { name: "Notifications", icon: Bell },
  { name: "Backup & Data", icon: Database },
];

const schoolProfileSections = [{ name: "School Profile", icon: Building2 }];

const systemAdminSections = [
  { name: "School Onboarding", icon: BookUser },
  { name: "System Overview", icon: ServerCog },
];

const emptySchoolForm = {
  schoolName: "",
  schoolCode: "",
  county: "",
  subcounty: "",
  schoolEmail: "",
  schoolPhone: "",
  adminName: "",
  adminEmail: "",
  adminPhone: "",
  adminPassword: "",
  schoolCategories: ["primary_junior_secondary"] as string[],
};

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read logo file."));
    reader.readAsDataURL(file);
  });

const isMissingLogoColumnError = (error: { message?: string } | null) =>
  Boolean(error?.message && error.message.includes("logo_url"));

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
};

const fetchSchoolProfileById = async (schoolId: string) => {
  const baseFields =
    "id, name, code, county, subcounty, contact_email, contact_phone, administrator_name, administrator_email, administrator_phone, school_categories";
  const fieldsWithLogo = `${baseFields}, logo_url`;

  const { data, error } = await supabase
    .from("schools")
    .select(fieldsWithLogo)
    .eq("id", schoolId)
    .maybeSingle();

  if (!error) return data;
  if (!isMissingLogoColumnError(error)) throw error;

  const fallback = await supabase
    .from("schools")
    .select(baseFields)
    .eq("id", schoolId)
    .maybeSingle();

  if (fallback.error) throw fallback.error;
  return fallback.data ? { ...fallback.data, logo_url: null } : null;
};

export default function Settings() {
  const { user } = useRole();
  const { user: authUser, session } = useAuth();
  const { schoolId } = useSchoolScope();
  const queryClient = useQueryClient();
  const { data: academicYear, isLoading: academicYearLoading } = useAcademicYear();
  const updateAcademicYear = useUpsertAcademicYear();
  const [activeSection, setActiveSection] = useState(
    user.role === "system_admin" ? "School Onboarding" : "School Profile"
  );
  const [isRegisteringSchool, setIsRegisteringSchool] = useState(false);
  const [schoolForm, setSchoolForm] = useState(emptySchoolForm);
  const [logoUploading, setLogoUploading] = useState(false);
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
    setActiveSection(user.role === "system_admin" ? "School Onboarding" : "School Profile");
  }, [user.role]);

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

  const { data: systemSummary } = useQuery({
    queryKey: ["system-admin-summary"],
    queryFn: async () => {
      if (!session?.access_token) throw new Error("Missing session.");
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const response = await fetch(`${apiUrl}/api/system/summary`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to load system summary.");
      }
      return response.json();
    },
    enabled: user.role === "system_admin" && Boolean(session?.access_token),
  });

  const { data: apiHealth = { ok: false, timestamp: null as string | null } } = useQuery({
    queryKey: ["settings-api-health"],
    queryFn: async () => {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const response = await fetch(`${apiUrl}/api/health`);
      if (!response.ok) throw new Error("Health check failed.");
      const payload = await response.json();
      return {
        ok: Boolean(payload.ok),
        timestamp: payload.timestamp || null,
      };
    },
    enabled: user.role === "system_admin",
    retry: 0,
  });

  const { data: schoolProfile } = useQuery({
    queryKey: ["school-profile", schoolId, authUser?.id, user.role],
    queryFn: async () => {
      let resolvedSchoolId = schoolId || null;

      if (!resolvedSchoolId && authUser?.id) {
        const [{ data: profile }, { data: adminSchool }, { data: teacher }, { data: parentByUserId }, { data: parentByEmail }] =
          await Promise.all([
            supabase
              .from("profiles")
              .select("school_id")
              .eq("user_id", authUser.id)
              .maybeSingle(),
            supabase
              .from("schools")
              .select("id")
              .eq("admin_user_id", authUser.id)
              .maybeSingle(),
            supabase
              .from("teachers")
              .select("school_id")
              .eq("user_id", authUser.id)
              .maybeSingle(),
            supabase
              .from("parents")
              .select("school_id")
              .eq("user_id", authUser.id)
              .maybeSingle(),
            authUser.email
              ? supabase
                  .from("parents")
                  .select("school_id")
                  .ilike("email", authUser.email)
                  .maybeSingle()
              : Promise.resolve({ data: null }),
          ]);

        resolvedSchoolId =
          profile?.school_id ||
          adminSchool?.id ||
          teacher?.school_id ||
          parentByUserId?.school_id ||
          parentByEmail?.school_id ||
          null;
      }

      if (resolvedSchoolId) {
        const data = await fetchSchoolProfileById(resolvedSchoolId);
        if (data) return data;
      }

      return null;
    },
    enabled: user.role !== "system_admin" && Boolean(authUser?.id),
  });
  const editableSchoolId = schoolId || schoolProfile?.id || null;

  const systemRoleBreakdown = useMemo(
    () => (systemSummary?.metrics?.roleBreakdown || {}) as Record<string, number>,
    [systemSummary]
  );
  const systemSchools = systemSummary?.schools || [];
  const systemProfilesCount = systemSummary?.metrics?.totalSignups || 0;
  const assignedRoles = systemSummary?.metrics?.assignedRoles || 0;
  const schoolsWithBasic = systemSummary?.metrics?.schoolsWithBasic || 0;
  const schoolsWithSenior = systemSummary?.metrics?.schoolsWithSenior || 0;
  const schoolsWithBoth = systemSummary?.metrics?.schoolsWithBoth || 0;

  const handleSaveAcademicYear = async () => {
    await updateAcademicYear.mutateAsync({
      ...yearForm,
      current_term: Number(yearForm.current_term),
    });
  };

  const handleSchoolLogoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !editableSchoolId || user.role !== "admin") return;
    if (!file.type.startsWith("image/")) {
      toast.error("Select an image file for the school logo.");
      return;
    }
    if (file.size > 1024 * 1024) {
      toast.error("School logo must be 1MB or smaller.");
      return;
    }

    try {
      setLogoUploading(true);
      const logoUrl = await fileToDataUrl(file);
      const { error } = await supabase
        .from("schools")
        .update({ logo_url: logoUrl })
        .eq("id", editableSchoolId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["school-profile"] });
      toast.success("School logo updated.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update school logo."));
    } finally {
      setLogoUploading(false);
    }
  };

  const handleRemoveSchoolLogo = async () => {
    if (!editableSchoolId || user.role !== "admin") return;

    try {
      setLogoUploading(true);
      const { error } = await supabase
        .from("schools")
        .update({ logo_url: null })
        .eq("id", editableSchoolId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["school-profile"] });
      toast.success("School logo removed.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to remove school logo."));
    } finally {
      setLogoUploading(false);
    }
  };

  const toggleSchoolCategory = (category: string, checked: boolean) => {
    setSchoolForm((prev) => ({
      ...prev,
      schoolCategories: checked
        ? Array.from(new Set([...prev.schoolCategories, category]))
        : prev.schoolCategories.filter((value) => value !== category),
    }));
  };

  const handleRegisterSchool = async () => {
    if (!session?.access_token) {
      toast.error("You must be signed in to register a school.");
      return;
    }

    if (
      !schoolForm.schoolName.trim() ||
      !schoolForm.schoolCode.trim() ||
      !schoolForm.adminName.trim() ||
      !schoolForm.adminEmail.trim() ||
      !schoolForm.adminPassword.trim()
    ) {
      toast.error("Fill in the school name, code, and administrator credentials.");
      return;
    }

    if (schoolForm.schoolCategories.length === 0) {
      toast.error("Select at least one school category.");
      return;
    }

    setIsRegisteringSchool(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const response = await fetch(`${apiUrl}/api/system/schools`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(schoolForm),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Failed to register school.");
      }

      toast.success(`School registered: ${payload.school?.name || schoolForm.schoolName}`);
      setSchoolForm(emptySchoolForm);
      queryClient.invalidateQueries({ queryKey: ["system-admin-summary"] });
      queryClient.invalidateQueries({ queryKey: ["settings-api-health"] });
    } catch (error) {
      if (error instanceof TypeError) {
        toast.error("Could not reach the school onboarding API. Start the server with `npm run dev:server` or check `VITE_API_URL`/CORS.");
      } else {
        toast.error(error instanceof Error ? error.message : "Failed to register school.");
      }
    } finally {
      setIsRegisteringSchool(false);
    }
  };

  const sections =
    user.role === "system_admin"
      ? systemAdminSections
      : user.role === "admin"
        ? adminSections
        : schoolProfileSections;

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title font-display">Settings</h1>
        <p className="page-subtitle">
          {user.role === "system_admin"
            ? "Register schools, assign their administrators, and monitor platform health."
            : user.role === "admin"
              ? "Manage school and system settings."
              : "View the registered school profile and contact details."
          }
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-card rounded-xl border border-border/50 p-4">
            <nav className="space-y-1">
              {sections.map((item) => (
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

        <div className="lg:col-span-2 space-y-6">
          {user.role === "system_admin" && activeSection === "School Onboarding" && (
            <div className="bg-card rounded-xl border border-border/50 p-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <BookUser className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display font-semibold text-foreground">Register School and Administrator</h2>
                  <p className="text-sm text-muted-foreground">
                    Create the school record and provision only the main administrator for that school.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="schoolName">School Name</Label>
                  <Input
                    id="schoolName"
                    value={schoolForm.schoolName}
                    onChange={(e) => setSchoolForm((prev) => ({ ...prev, schoolName: e.target.value }))}
                    placeholder="Sanaet Education Centre"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schoolCode">School Code</Label>
                  <Input
                    id="schoolCode"
                    value={schoolForm.schoolCode}
                    onChange={(e) => setSchoolForm((prev) => ({ ...prev, schoolCode: e.target.value.toUpperCase() }))}
                    placeholder="SEC001"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>School Category</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="flex items-start gap-3 rounded-xl border border-border/50 p-4 cursor-pointer">
                    <Checkbox
                      checked={schoolForm.schoolCategories.includes("primary_junior_secondary")}
                      onCheckedChange={(checked) => toggleSchoolCategory("primary_junior_secondary", checked === true)}
                    />
                    <div>
                      <p className="font-medium text-foreground">Primary and Junior Secondary</p>
                      <p className="text-sm text-muted-foreground">PP1 to Grade 9</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 rounded-xl border border-border/50 p-4 cursor-pointer">
                    <Checkbox
                      checked={schoolForm.schoolCategories.includes("senior_secondary")}
                      onCheckedChange={(checked) => toggleSchoolCategory("senior_secondary", checked === true)}
                    />
                    <div>
                      <p className="font-medium text-foreground">Senior Secondary</p>
                      <p className="text-sm text-muted-foreground">Grade 10 to Grade 12</p>
                    </div>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  A school may belong to one category or both.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="county">County</Label>
                  <Input
                    id="county"
                    value={schoolForm.county}
                    onChange={(e) => setSchoolForm((prev) => ({ ...prev, county: e.target.value }))}
                    placeholder="Kajiado"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subcounty">Sub-County</Label>
                  <Input
                    id="subcounty"
                    value={schoolForm.subcounty}
                    onChange={(e) => setSchoolForm((prev) => ({ ...prev, subcounty: e.target.value }))}
                    placeholder="Loitokitok"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="schoolEmail">School Email</Label>
                  <Input
                    id="schoolEmail"
                    type="email"
                    value={schoolForm.schoolEmail}
                    onChange={(e) => setSchoolForm((prev) => ({ ...prev, schoolEmail: e.target.value }))}
                    placeholder="admin@school.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schoolPhone">School Phone</Label>
                  <Input
                    id="schoolPhone"
                    value={schoolForm.schoolPhone}
                    onChange={(e) => setSchoolForm((prev) => ({ ...prev, schoolPhone: e.target.value }))}
                    placeholder="+254 700 000 000"
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adminName">Administrator Name</Label>
                  <Input
                    id="adminName"
                    value={schoolForm.adminName}
                    onChange={(e) => setSchoolForm((prev) => ({ ...prev, adminName: e.target.value }))}
                    placeholder="Jane Naserian"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Administrator Email</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    value={schoolForm.adminEmail}
                    onChange={(e) => setSchoolForm((prev) => ({ ...prev, adminEmail: e.target.value }))}
                    placeholder="head@school.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adminPhone">Administrator Phone</Label>
                  <Input
                    id="adminPhone"
                    value={schoolForm.adminPhone}
                    onChange={(e) => setSchoolForm((prev) => ({ ...prev, adminPhone: e.target.value }))}
                    placeholder="+254 711 000 000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminPassword">Temporary Password</Label>
                  <Input
                    id="adminPassword"
                    type="password"
                    value={schoolForm.adminPassword}
                    onChange={(e) => setSchoolForm((prev) => ({ ...prev, adminPassword: e.target.value }))}
                    placeholder="At least 6 characters"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/30 px-4 py-3">
                <div>
                  <p className="font-medium text-foreground">School admin provisioning</p>
                  <p className="text-sm text-muted-foreground">
                    This only creates the school and its main administrator. It does not expose school internals to the system admin.
                  </p>
                </div>
                <Button onClick={handleRegisterSchool} disabled={isRegisteringSchool}>
                  {isRegisteringSchool ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    "Register School"
                  )}
                </Button>
              </div>
            </div>
          )}

          {user.role === "system_admin" && activeSection === "System Overview" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="rounded-xl border border-border/50 bg-card p-5">
                  <p className="text-sm text-muted-foreground">Registered Schools</p>
                  <p className="mt-2 text-3xl font-display font-bold text-foreground">{systemSchools.length}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-card p-5">
                  <p className="text-sm text-muted-foreground">Platform Signups</p>
                  <p className="mt-2 text-3xl font-display font-bold text-foreground">{systemProfilesCount}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-card p-5">
                  <p className="text-sm text-muted-foreground">Assigned Roles</p>
                  <p className="mt-2 text-3xl font-display font-bold text-foreground">{assignedRoles}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-card p-5">
                  <p className="text-sm text-muted-foreground">API Health</p>
                  <p className="mt-2 text-3xl font-display font-bold text-foreground">
                    {apiHealth.ok ? "Healthy" : "Offline"}
                  </p>
                </div>
              </div>

              <div className="bg-card rounded-xl border border-border/50 p-6">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="font-display font-semibold text-foreground">System Usage and Health</h2>
                    <p className="text-sm text-muted-foreground">Current platform allocation, school coverage, and category mix.</p>
                  </div>
                  <Badge variant="outline">
                    {apiHealth.timestamp
                      ? `Health checked ${new Date(apiHealth.timestamp).toLocaleTimeString("en-KE", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}`
                      : "Health check pending"}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {[
                    { label: "PP1 to Grade 9 schools", value: schoolsWithBasic },
                    { label: "Grade 10 to 12 schools", value: schoolsWithSenior },
                    { label: "Schools with both", value: schoolsWithBoth },
                    { label: "System admins", value: systemRoleBreakdown.system_admin || 0 },
                    { label: "School admins", value: systemRoleBreakdown.admin || 0 },
                    { label: "Teachers", value: systemRoleBreakdown.teacher || 0 },
                    { label: "Parents", value: systemRoleBreakdown.parent || 0 },
                    { label: "Bursars", value: systemRoleBreakdown.bursar || 0 },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-muted/40 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
                      <p className="mt-2 text-2xl font-display font-bold text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  {systemSchools.length > 0 ? (
                    systemSchools.slice(0, 6).map((school) => (
                      <div key={school.id} className="flex flex-col gap-2 rounded-xl border border-border/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium text-foreground">{school.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {school.code}
                            {(school.county || school.subcounty) &&
                              ` • ${[school.subcounty, school.county].filter(Boolean).join(", ")}`}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(school.school_categories || []).map((category: string) => (
                              <Badge key={category} variant="outline">
                                {category === "primary_junior_secondary" ? "PP1 to Grade 9" : "Grade 10 to 12"}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No schools registered yet.</p>
                  )}
                </div>
                <div className="mt-6 rounded-xl border border-border/50 bg-muted/30 px-4 py-3">
                  <p className="font-medium text-foreground">System admin access</p>
                  <p className="text-sm text-muted-foreground">
                    This role can register schools and their administrators, but it remains limited to overall system performance and onboarding visibility.
                  </p>
                </div>
              </div>
            </>
          )}

          {user.role !== "system_admin" && activeSection === "School Profile" && (
            <div className="bg-card rounded-xl border border-border/50 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display font-semibold text-foreground">School Profile</h2>
                  <p className="text-sm text-muted-foreground">Core school identity shown across the system.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3 md:col-span-2">
                  <Label>School Logo</Label>
                  <div className="rounded-xl border border-border/50 p-4">
                    {schoolProfile?.logo_url ? (
                      <img
                        src={schoolProfile.logo_url}
                        alt={`${schoolProfile.name || "School"} logo`}
                        className="h-24 w-24 rounded-lg object-contain border border-border/50 bg-muted/30"
                      />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-border/50 bg-muted/30 text-xs text-muted-foreground">
                        No logo
                      </div>
                    )}
                    {user.role === "admin" && (
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleSchoolLogoChange}
                          disabled={logoUploading || !editableSchoolId}
                          className="max-w-sm"
                        />
                        {schoolProfile?.logo_url && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleRemoveSchoolLogo}
                            disabled={logoUploading || !editableSchoolId}
                          >
                            Remove Logo
                          </Button>
                        )}
                      </div>
                    )}
                    {user.role === "admin" && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Upload a square or landscape logo up to 1MB. It will appear on generated reports for this school.
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schoolNameStatic">School Name</Label>
                  <Input id="schoolNameStatic" value={schoolProfile?.name || ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schoolCodeStatic">School Code</Label>
                  <Input id="schoolCodeStatic" value={schoolProfile?.code || ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="countyStatic">County</Label>
                  <Input id="countyStatic" value={schoolProfile?.county || ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subcountyStatic">Sub-County</Label>
                  <Input id="subcountyStatic" value={schoolProfile?.subcounty || ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schoolEmailStatic">School Email</Label>
                  <Input id="schoolEmailStatic" value={schoolProfile?.contact_email || ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schoolPhoneStatic">School Phone</Label>
                  <Input id="schoolPhoneStatic" value={schoolProfile?.contact_phone || ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminNameStatic">School Administrator</Label>
                  <Input id="adminNameStatic" value={schoolProfile?.administrator_name || ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminEmailStatic">Administrator Email</Label>
                  <Input id="adminEmailStatic" value={schoolProfile?.administrator_email || ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminPhoneStatic">Administrator Phone</Label>
                  <Input id="adminPhoneStatic" value={schoolProfile?.administrator_phone || ""} disabled />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>School Category</Label>
                  <div className="flex flex-wrap gap-2 rounded-xl border border-border/50 px-4 py-3">
                    {(schoolProfile?.school_categories || []).length > 0 ? (
                      schoolProfile?.school_categories.map((category: string) => (
                        <Badge key={category} variant="outline">
                          {getSchoolCategoryLabel(category)}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No category assigned yet.</span>
                    )}
                  </div>
                </div>
              </div>
              {!schoolProfile && (
                <div className="mt-6 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-muted-foreground">
                  School profile details have not been linked to this account yet. The registered school record should appear here once the account is attached to its school.
                </div>
              )}
            </div>
          )}

          {user.role === "admin" && activeSection === "Academic Year" && (
            <div className="bg-card rounded-xl border border-border/50 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display font-semibold text-foreground">Academic Year</h2>
                  <p className="text-sm text-muted-foreground">Manage term dates and the current academic cycle.</p>
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
                        placeholder="2026"
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

                  {[
                    { key: "term1", label: "Term 1" },
                    { key: "term2", label: "Term 2" },
                    { key: "term3", label: "Term 3" },
                  ].map((term) => (
                    <div key={term.key}>
                      <h3 className="font-medium text-foreground mb-4">{term.label}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`${term.key}Start`}>Start</Label>
                          <Input
                            id={`${term.key}Start`}
                            type="date"
                            value={yearForm[`${term.key}_start` as keyof typeof yearForm] as string}
                            onChange={(e) =>
                              setYearForm((prev) => ({ ...prev, [`${term.key}_start`]: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`${term.key}End`}>End</Label>
                          <Input
                            id={`${term.key}End`}
                            type="date"
                            value={yearForm[`${term.key}_end` as keyof typeof yearForm] as string}
                            onChange={(e) =>
                              setYearForm((prev) => ({ ...prev, [`${term.key}_end`]: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="flex items-center justify-between rounded-xl border border-border/50 px-4 py-3">
                    <div className="space-y-1">
                      <Label htmlFor="isCurrent">Current Academic Year</Label>
                      <p className="text-sm text-muted-foreground">Use this year for attendance, fees, and assessments by default.</p>
                    </div>
                    <Switch
                      id="isCurrent"
                      checked={yearForm.is_current}
                      onCheckedChange={(checked) => setYearForm((prev) => ({ ...prev, is_current: checked }))}
                    />
                  </div>

                  <Button onClick={handleSaveAcademicYear} disabled={updateAcademicYear.isPending}>
                    {updateAcademicYear.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Academic Year"
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {user.role === "admin" && activeSection === "User Management" && (
            <div className="bg-card rounded-xl border border-border/50 p-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display font-semibold text-foreground">User Management</h2>
                  <p className="text-sm text-muted-foreground">Assign operational roles and keep the right staff in the right workflows.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <AssignBursarDialog />
                <AssignLibrarianDialog />
              </div>
            </div>
          )}

          {user.role === "admin" && ["Security", "Notifications", "Backup & Data"].includes(activeSection) && (
            <div className="bg-card rounded-xl border border-border/50 p-6">
              <h2 className="font-display font-semibold text-foreground">{activeSection}</h2>
              <p className="text-sm text-muted-foreground mt-2">
                {activeSection === "Security" && "Role assignment and session expiry are active. Extend this section if you want password policy or audit logs next."}
                {activeSection === "Notifications" && "Notice publishing and delivery are already configured through the notices module and server email worker."}
                {activeSection === "Backup & Data" && "Supabase remains the source of truth for application data. Add export and restore workflows here when you are ready."}
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
