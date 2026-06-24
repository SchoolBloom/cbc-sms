import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Loader2, UserPlus, Power } from "lucide-react";
import {
  usePlatformSchools,
  useCreateSchool,
  useProvisionSchoolAdmin,
  useToggleSchoolAccess,
  type CreateSchoolInput,
} from "@/hooks/usePlatformSchools";

const levelOptions = [
  { id: "primary_junior_secondary", label: "Primary & Junior Secondary" },
  { id: "senior_secondary", label: "Senior Secondary" },
];

const defaultForm: CreateSchoolInput = {
  name: "",
  nemis_code: "",
  knec_code: "",
  levels_offered: ["primary_junior_secondary"],
  county: "",
  subcounty: "",
  contact_email: "",
  contact_phone: "",
  administrator_name: "",
  administrator_email: "",
  administrator_phone: "",
};

export default function PlatformSchools() {
  const { data: schools = [], isLoading } = usePlatformSchools();
  const createSchool = useCreateSchool();
  const provisionAdmin = useProvisionSchoolAdmin();
  const toggleAccess = useToggleSchoolAccess();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateSchoolInput>(defaultForm);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const schoolId = await createSchool.mutateAsync(form);
    setOpen(false);
    setForm(defaultForm);

    if (form.administrator_email) {
      try {
        await provisionAdmin.mutateAsync({
          schoolId,
          adminEmail: form.administrator_email,
        });
      } catch {
        // Admin may need to sign up first; school is still created
      }
    }
  };

  const toggleLevel = (levelId: string, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      levels_offered: checked
        ? Array.from(new Set([...prev.levels_offered, levelId]))
        : prev.levels_offered.filter((level) => level !== levelId),
    }));
  };

  return (
    <DashboardLayout title="School Onboarding" subtitle="Register schools and provision initial administrators">
      <div className="flex justify-end mb-6">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Register School
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Register New School</DialogTitle>
              <DialogDescription>
                Capture NEMIS/KNEC codes and administrator details. The admin must have a platform account before provisioning.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="school-name">School Name</Label>
                <Input
                  id="school-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nemis-code">NEMIS Code</Label>
                  <Input
                    id="nemis-code"
                    value={form.nemis_code}
                    onChange={(e) => setForm({ ...form, nemis_code: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="knec-code">KNEC Code</Label>
                  <Input
                    id="knec-code"
                    value={form.knec_code}
                    onChange={(e) => setForm({ ...form, knec_code: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Levels Offered</Label>
                <div className="space-y-2">
                  {levelOptions.map((level) => (
                    <label key={level.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={form.levels_offered.includes(level.id)}
                        onCheckedChange={(checked) => toggleLevel(level.id, checked === true)}
                      />
                      {level.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="county">County</Label>
                  <Input
                    id="county"
                    value={form.county}
                    onChange={(e) => setForm({ ...form, county: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subcounty">Sub-county</Label>
                  <Input
                    id="subcounty"
                    value={form.subcounty}
                    onChange={(e) => setForm({ ...form, subcounty: e.target.value })}
                  />
                </div>
              </div>
              <div className="border-t pt-4 space-y-3">
                <p className="text-sm font-medium">Initial School Administrator</p>
                <div className="space-y-2">
                  <Label htmlFor="admin-name">Administrator Name</Label>
                  <Input
                    id="admin-name"
                    value={form.administrator_name}
                    onChange={(e) => setForm({ ...form, administrator_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Administrator Email</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    value={form.administrator_email}
                    onChange={(e) => setForm({ ...form, administrator_email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-phone">Administrator Phone</Label>
                  <Input
                    id="admin-phone"
                    value={form.administrator_phone}
                    onChange={(e) => setForm({ ...form, administrator_phone: e.target.value })}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createSchool.isPending}>
                {createSchool.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Registering...
                  </>
                ) : (
                  "Register School"
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Schools</CardTitle>
          <CardDescription>Activate or suspend school platform access. Super Admins cannot view learner data.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : schools.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No schools registered yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School</TableHead>
                  <TableHead>NEMIS</TableHead>
                  <TableHead>KNEC</TableHead>
                  <TableHead>Administrator</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schools.map((school) => (
                  <TableRow key={school.id}>
                    <TableCell className="font-medium">{school.name}</TableCell>
                    <TableCell>{school.nemis_code || school.code}</TableCell>
                    <TableCell>{school.knec_code || "-"}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{school.administrator_name || "-"}</p>
                        <p className="text-muted-foreground">{school.administrator_email || "-"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={school.active_status ? "default" : "secondary"}>
                        {school.active_status ? "Active" : school.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {!school.admin_user_id && school.administrator_email && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          disabled={provisionAdmin.isPending}
                          onClick={() =>
                            provisionAdmin.mutate({
                              schoolId: school.id,
                              adminEmail: school.administrator_email!,
                            })
                          }
                        >
                          <UserPlus className="w-3 h-3" />
                          Provision Admin
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant={school.active_status ? "destructive" : "default"}
                        className="gap-1"
                        disabled={toggleAccess.isPending}
                        onClick={() =>
                          toggleAccess.mutate({
                            schoolId: school.id,
                            active: !school.active_status,
                          })
                        }
                      >
                        <Power className="w-3 h-3" />
                        {school.active_status ? "Suspend" : "Activate"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
