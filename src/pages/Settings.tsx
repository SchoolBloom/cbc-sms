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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAcademicYear, useUpsertAcademicYear } from "@/hooks/useAcademicYear";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { getSchoolCategoryLabel } from "@/lib/schoolCategories";
import {
  Bell,
  BookUser,
  Building2,
  Calendar,
  CreditCard,
  Database,
  Edit,
  Loader2,
  ServerCog,
  Shield,
  Trash2,
  Users,
} from "lucide-react";

const adminSections = [
  { name: "School Profile", icon: Building2 },
  { name: "Academic Year", icon: Calendar },
  { name: "Security", icon: Shield },
  { name: "Notifications", icon: Bell },
  { name: "Backup & Data", icon: Database },
];

const schoolProfileSections = [{ name: "School Profile", icon: Building2 }];

const userSecuritySections = [
  { name: "School Profile", icon: Building2 },
  { name: "Security", icon: Shield },
];

const systemAdminSections = [
  { name: "School Management", icon: Building2 },
  { name: "Security", icon: Shield },
];



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
    user.role === "system_admin" ? "School Management" : "School Profile"
  );
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
    setActiveSection(user.role === "system_admin" ? "School Management" : "School Profile");
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

  const { data: systemSchools = [] } = useQuery({
    queryKey: ["system-admin-schools-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schools")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: user.role === "system_admin",
  });

  // System metrics and profile queries removed from settings (moved to dashboard)

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



  const sections =
    user.role === "system_admin"
      ? systemAdminSections
      : user.role === "admin"
        ? adminSections
        : userSecuritySections;

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


          {user.role === "system_admin" && activeSection === "School Management" && (
            <SchoolManagementPanel />
          )}

          {/* System Overview section moved to system admin dashboard */}

          {user.role === "system_admin" && activeSection === "Security" && (
            <div className="bg-card rounded-xl border border-border/50 p-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display font-semibold text-foreground">Security</h2>
                  <p className="text-sm text-muted-foreground">Manage your account security settings.</p>
                </div>
              </div>
              <ChangePasswordForm />
            </div>
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
                        Upload a square or landscape logo up to 1MB.
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

          {user.role !== "system_admin" && user.role !== "admin" && activeSection === "Security" && (
            <div className="bg-card rounded-xl border border-border/50 p-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display font-semibold text-foreground">Security</h2>
                  <p className="text-sm text-muted-foreground">Manage your account security settings.</p>
                </div>
              </div>
              <ChangePasswordForm />
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
                      <p className="text-sm text-muted-foreground">
                        Use this year for attendance, fees, and assessments by default. Setting a new current year promotes learners to the next grade, except Grade 9 students who transition to Senior Secondary via pathway placement and admission at the receiving school.
                      </p>
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



          {user.role === "admin" && ["Security", "Notifications", "Backup & Data"].includes(activeSection) && (
            <div className="space-y-6">
              {activeSection === "Security" && (
                <div className="bg-card rounded-xl border border-border/50 p-6 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-display font-semibold text-foreground">Security</h2>
                      <p className="text-sm text-muted-foreground">Manage your account security settings.</p>
                    </div>
                  </div>
                  <ChangePasswordForm />
                </div>
              )}
              {activeSection === "Notifications" && (
                <div className="bg-card rounded-xl border border-border/50 p-6">
                  <h2 className="font-display font-semibold text-foreground">Notifications</h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    Notice publishing and delivery are already configured through the notices module and server email worker.
                  </p>
                </div>
              )}
              {activeSection === "Backup & Data" && (
                <div className="bg-card rounded-xl border border-border/50 p-6">
                  <h2 className="font-display font-semibold text-foreground">Backup & Data</h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    Supabase remains the source of truth for application data. Add export and restore workflows here when you are ready.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}



interface SchoolData {
  id: string;
  name: string;
  code: string;
  administrator_name?: string;
  administrator_email?: string;
  administrator_phone?: string;
  admin_user_id?: string;
}

function SchoolManagementPanel() {
  const [editingSchool, setEditingSchool] = useState<SchoolData | null>(null);
  const [editForm, setEditForm] = useState({
    adminName: "",
    adminEmail: "",
    adminPhone: "",
    adminPassword: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const queryClient = useQueryClient();

  const { data: schools = [], isLoading } = useQuery({
    queryKey: ["system-admin-schools"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schools")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data || []) as SchoolData[];
    },
  });

  const openEditDialog = (school: SchoolData) => {
    setEditingSchool(school);
    setEditForm({
      adminName: school.administrator_name || "",
      adminEmail: school.administrator_email || "",
      adminPhone: school.administrator_phone || "",
      adminPassword: "",
    });
  };

  const handleUpdateAdmin = async () => {
    if (!editingSchool) return;
    
    setIsUpdating(true);
    try {
      const { error: updateFieldsError } = await supabase
        .from("schools")
        .update({
          administrator_name: editForm.adminName,
          administrator_email: editForm.adminEmail.trim().toLowerCase(),
          administrator_phone: editForm.adminPhone || null,
        })
        .eq("id", editingSchool.id);

      if (updateFieldsError) throw updateFieldsError;

      const { error } = await (supabase as any).rpc("provision_school_administrator", {
        _school_id: editingSchool.id,
        _admin_email: editForm.adminEmail.trim().toLowerCase(),
      });

      if (error) throw error;

      toast.success("School administrator updated successfully");
      queryClient.invalidateQueries({ queryKey: ["system-admin-schools"] });
      queryClient.invalidateQueries({ queryKey: ["system-admin-schools-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["school-profile"] });
      setEditingSchool(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update administrator");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <div className="bg-card rounded-xl border border-border/50 p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-foreground">School Management</h2>
            <p className="text-sm text-muted-foreground">Manage school administrators. Changing admin will revoke access from the previous admin.</p>
          </div>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : schools.length > 0 ? (
            schools.map((school) => (
              <div key={school.id} className="rounded-xl border border-border/50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium text-foreground">{school.name}</h3>
                      <Badge variant="outline">{school.code}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><span className="font-medium text-foreground">Current Admin:</span> {school.administrator_name || "Not set"}</p>
                      <p><span className="font-medium text-foreground">Email:</span> {school.administrator_email || "Not set"}</p>
                      <p><span className="font-medium text-foreground">Phone:</span> {school.administrator_phone || "Not set"}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(school)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Admin
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No schools registered yet.</p>
          )}
        </div>
      </div>

      <Dialog open={!!editingSchool} onOpenChange={(open) => !open && setEditingSchool(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Edit School Administrator</DialogTitle>
            <DialogDescription>
              Update the administrator for {editingSchool?.name}. 
              The previous admin will lose access and the new admin will gain access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editAdminName">Administrator Name</Label>
              <Input
                id="editAdminName"
                value={editForm.adminName}
                onChange={(e) => setEditForm((prev) => ({ ...prev, adminName: e.target.value }))}
                placeholder="Enter full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editAdminEmail">Administrator Email</Label>
              <Input
                id="editAdminEmail"
                type="email"
                value={editForm.adminEmail}
                onChange={(e) => setEditForm((prev) => ({ ...prev, adminEmail: e.target.value }))}
                placeholder="admin@school.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editAdminPhone">Administrator Phone</Label>
              <Input
                id="editAdminPhone"
                value={editForm.adminPhone}
                onChange={(e) => setEditForm((prev) => ({ ...prev, adminPhone: e.target.value }))}
                placeholder="+254 700 000 000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editAdminPassword">New Password (Optional)</Label>
              <Input
                id="editAdminPassword"
                type="password"
                value={editForm.adminPassword}
                onChange={(e) => setEditForm((prev) => ({ ...prev, adminPassword: e.target.value }))}
                placeholder="Leave blank to keep existing password"
              />
              <p className="text-xs text-muted-foreground">
                Only enter a new password if you want to reset the admin's login credentials.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEditingSchool(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateAdmin} 
              disabled={isUpdating || !editForm.adminName || !editForm.adminEmail}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Administrator"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ChangePasswordForm() {
  const { user: authUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: authUser?.email || "",
        password: currentPassword,
      });

      if (signInError) {
        setError("Current password is incorrect.");
        setIsLoading(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message || "Failed to update password.");
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-sm font-medium text-foreground">Change Password</h3>
      
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Current Password</Label>
          <Input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter your current password"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="newPassword">New Password</Label>
          <Input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password (min 6 characters)"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            required
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {success && (
        <p className="text-sm text-success">Password updated successfully!</p>
      )}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Updating...
          </>
        ) : (
          "Update Password"
        )}
      </Button>
    </form>
  );
}
