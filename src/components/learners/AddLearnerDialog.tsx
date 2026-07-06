import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTransferLearner } from "@/hooks/useTransferLearner";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Loader2, ArrowLeftRight, Search, Info } from "lucide-react";
import { SENIOR_SECONDARY_PATHWAYS, isSeniorSecondaryGrade } from "@/lib/schoolCategories";

const learnerSchema = z.object({
  admission_number: z.string().min(1, "Admission number is required").max(20),
  assessment_number: z.string().max(30).optional(),
  birth_certificate_number: z.string().min(1, "Birth certificate number is required").max(50),
  upi_number: z.string().max(50).optional(),
  full_name: z.string().min(2, "Name must be at least 2 characters").max(100),
  date_of_birth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["male", "female"], { required_error: "Please select gender" }),
  class_id: z.string().optional(),
  pathway: z.enum(SENIOR_SECONDARY_PATHWAYS).optional(),
  senior_pathway: z.enum(SENIOR_SECONDARY_PATHWAYS).optional(),
  previous_school: z.string().max(255).optional(),
  parent_id: z.string().optional(),
  parent_id_secondary: z.string().optional(),
  medical_notes: z.string().max(500).optional(),
}).refine(
  (data) => !data.parent_id || !data.parent_id_secondary || data.parent_id !== data.parent_id_secondary,
  {
    message: "Second parent must be different from the first.",
    path: ["parent_id_secondary"],
  }
);

type LearnerFormData = z.infer<typeof learnerSchema>;

interface AddLearnerDialogProps {
  trigger?: React.ReactNode;
}

export function AddLearnerDialog({ trigger }: AddLearnerDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"new" | "transfer">("new");
  const queryClient = useQueryClient();

  // --- Transfer state ---
  const [identifierType, setIdentifierType] = useState<"UPI" | "KNEC" | "BIRTH_CERT">("UPI");
  const [identifierValue, setIdentifierValue] = useState("");
  const [transferAdmissionNumber, setTransferAdmissionNumber] = useState("");
  const [transferClassId, setTransferClassId] = useState("");

  const { schoolId } = useSchoolScope();
  const transferMutation = useTransferLearner();

  // --- New Admission form ---
  const form = useForm<LearnerFormData>({
    resolver: zodResolver(learnerSchema),
    defaultValues: {
      admission_number: "",
      assessment_number: "",
      birth_certificate_number: "",
      upi_number: "",
      full_name: "",
      date_of_birth: "",
      gender: undefined,
      class_id: "",
      pathway: undefined,
      senior_pathway: undefined,
      previous_school: "",
      parent_id: "",
      parent_id_secondary: "",
      medical_notes: "",
    },
  });
  const primaryParentId = form.watch("parent_id");
  const secondaryParentId = form.watch("parent_id_secondary");
  const selectedClassId = form.watch("class_id");

  // Fetch classes for dropdown
  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, grade, stream")
        .order("grade");
      if (error) throw error;
      return data;
    },
  });
  const selectedClass = classes.find((cls) => cls.id === selectedClassId);
  const requiresPathway = isSeniorSecondaryGrade(selectedClass?.grade);

  useEffect(() => {
    if (!requiresPathway) {
      form.setValue("pathway", undefined);
      form.clearErrors("pathway");
    }
  }, [form, requiresPathway]);

  // Fetch parents for dropdown
  const { data: parents = [] } = useQuery({
    queryKey: ["parents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parents")
        .select("id, full_name, phone")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const createLearner = useMutation({
    mutationFn: async (data: LearnerFormData) => {
      const learnerData = {
        admission_number: data.admission_number.trim(),
        assessment_number: data.assessment_number?.trim() || null,
        birth_certificate_number: data.birth_certificate_number?.trim() || null,
        upi_number: data.upi_number?.trim() || null,
        full_name: data.full_name.trim(),
        date_of_birth: data.date_of_birth,
        gender: data.gender,
        class_id: data.class_id || null,
        pathway: requiresPathway ? data.pathway || null : null,
        senior_pathway: requiresPathway ? data.senior_pathway || null : null,
        previous_school: data.previous_school?.trim() || null,
        parent_id: data.parent_id || null,
        parent_id_secondary: data.parent_id_secondary || null,
        medical_notes: data.medical_notes?.trim() || null,
      };
      
      const { error } = await supabase.from("learners").insert(learnerData);
      
      if (error) {
        // If the learner already exists by birth certificate, attempt to admit/transfer them automatically
        if (error.message.toLowerCase().includes("unique constraint") && 
            error.message.includes("birth_certificate_number") && 
            data.birth_certificate_number && schoolId) {
          
          const { error: transferError } = await supabase.rpc("admit_transfer_learner", {
            p_target_school_id: schoolId,
            p_identifier_type: "BIRTH_CERT",
            p_identifier_value: data.birth_certificate_number.trim(),
            p_new_admission_number: data.admission_number.trim(),
            p_new_class_id: data.class_id || "",
          });
          
          if (transferError) {
             throw new Error("Learner exists but could not be transferred: " + transferError.message);
          }
          
          // Optionally update other details that might have changed
          const updatePayload: any = {
            full_name: data.full_name.trim(),
            date_of_birth: data.date_of_birth,
            gender: data.gender,
            pathway: requiresPathway ? data.pathway || null : null,
            senior_pathway: requiresPathway ? data.senior_pathway || null : null,
            medical_notes: data.medical_notes?.trim() || null,
          };
          if (data.parent_id) updatePayload.parent_id = data.parent_id;
          if (data.parent_id_secondary) updatePayload.parent_id_secondary = data.parent_id_secondary;

          await supabase.from("learners").update(updatePayload).eq("birth_certificate_number", data.birth_certificate_number.trim());
          
          return;
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Learner added successfully");
      queryClient.invalidateQueries({ queryKey: ["learners"] });
      setOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onSubmitNewLearner = (data: LearnerFormData) => {
    if (requiresPathway && !data.pathway) {
      form.setError("pathway", { message: "Pathway is required for Grade 10 to Grade 12 learners" });
      return;
    }
    createLearner.mutate(data);
  };

  // --- Transfer handlers ---
  const resetTransferForm = () => {
    setIdentifierType("UPI");
    setIdentifierValue("");
    setTransferAdmissionNumber("");
    setTransferClassId("");
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!schoolId) {
      toast.error("Could not determine your school. Please reload.");
      return;
    }
    if (!identifierValue.trim()) {
      toast.error("Please enter the student identifier.");
      return;
    }
    if (!transferAdmissionNumber.trim()) {
      toast.error("Please enter the new admission number.");
      return;
    }
    if (!transferClassId) {
      toast.error("Please select a class.");
      return;
    }

    transferMutation.mutate(
      {
        targetSchoolId: schoolId,
        identifierType,
        identifierValue: identifierValue.trim(),
        newAdmissionNumber: transferAdmissionNumber.trim(),
        newClassId: transferClassId,
      },
      {
        onSuccess: () => {
          setOpen(false);
          resetTransferForm();
        },
      }
    );
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetTransferForm();
      form.reset();
      setActiveTab("new");
    }
  };

  const isNewAdmissionPending = createLearner.isPending;
  const isTransferPending = transferMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Learner
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {activeTab === "new" ? "Add New Learner" : (
              <span className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-primary" />
                Transfer Student Into School
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {activeTab === "new"
              ? "Enter the learner's details. All fields marked with * are required."
              : "Search for an existing student by their NEMIS UPI or KNEC Assessment Number and admit them into this school. Their SBA records will transfer automatically."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "new" | "transfer")} className="mt-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new" className="gap-1.5 text-xs">
              <Plus className="w-3.5 h-3.5" />
              New Admission
            </TabsTrigger>
            <TabsTrigger value="transfer" className="gap-1.5 text-xs">
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Transfer Student
            </TabsTrigger>
          </TabsList>

          {/* ==================== NEW ADMISSION TAB ==================== */}
          <TabsContent value="new" className="mt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitNewLearner)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="admission_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Admission No. *</FormLabel>
                        <FormControl>
                          <Input placeholder="2025/001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="assessment_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assessment No.</FormLabel>
                        <FormControl>
                          <Input placeholder="Optional" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Grace Wanjiku Kamau" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date_of_birth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="class_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {classes.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id}>
                              {cls.grade} - {cls.stream}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="birth_certificate_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Birth Certificate No.</FormLabel>
                        <FormControl>
                          <Input placeholder="BCN-2025-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="upi_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UPI Number</FormLabel>
                        <FormControl>
                          <Input placeholder="NEMIS UPI" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="previous_school"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Previous School</FormLabel>
                      <FormControl>
                        <Input placeholder="Transfer from..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {requiresPathway && (
                  <FormField
                    control={form.control}
                    name="pathway"
                    rules={{ required: "Pathway is required for Grade 10 to Grade 12 learners" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pathway *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select pathway" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SENIOR_SECONDARY_PATHWAYS.map((pathway) => (
                              <SelectItem key={pathway} value={pathway}>
                                {pathway}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="parent_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent/Guardian 1</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select parent/guardian" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {parents
                            .filter((parent) => parent.id !== secondaryParentId)
                            .map((parent) => (
                            <SelectItem key={parent.id} value={parent.id}>
                              {parent.full_name} ({parent.phone})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="parent_id_secondary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent/Guardian 2 (optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select second parent/guardian" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {parents
                            .filter((parent) => parent.id !== primaryParentId)
                            .map((parent) => (
                              <SelectItem key={parent.id} value={parent.id}>
                                {parent.full_name} ({parent.phone})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="medical_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Medical Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any allergies, conditions, or medical information..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isNewAdmissionPending}>
                    {isNewAdmissionPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add Learner"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          {/* ==================== TRANSFER STUDENT TAB ==================== */}
          <TabsContent value="transfer" className="mt-4">
            <form onSubmit={handleTransferSubmit} className="space-y-5">
              {/* Identifier Type Tabs */}
              <Tabs
                value={identifierType}
                onValueChange={(v) => {
                  setIdentifierType(v as "UPI" | "KNEC" | "BIRTH_CERT");
                  setIdentifierValue("");
                }}
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="UPI">NEMIS UPI</TabsTrigger>
                  <TabsTrigger value="KNEC">KNEC Assessment No.</TabsTrigger>
                  <TabsTrigger value="BIRTH_CERT">Birth Cert No.</TabsTrigger>
                </TabsList>

                <TabsContent value="UPI" className="mt-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="upi-input" className="text-xs font-semibold">
                      NEMIS Unique Pupil Identifier (UPI)
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="upi-input"
                        placeholder="e.g. G18A-0001-0002"
                        value={identifierValue}
                        onChange={(e) => setIdentifierValue(e.target.value)}
                        className="pl-8"
                        required
                        disabled={isTransferPending}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="KNEC" className="mt-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="knec-input" className="text-xs font-semibold">
                      KNEC Assessment Number
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="knec-input"
                        placeholder="e.g. 12345678001"
                        value={identifierValue}
                        onChange={(e) => setIdentifierValue(e.target.value)}
                        className="pl-8"
                        required
                        disabled={isTransferPending}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="BIRTH_CERT" className="mt-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="birth-cert-input" className="text-xs font-semibold">
                      Birth Certificate Number
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="birth-cert-input"
                        placeholder="e.g. BC-123456"
                        value={identifierValue}
                        onChange={(e) => setIdentifierValue(e.target.value)}
                        className="pl-8"
                        required
                        disabled={isTransferPending}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* New Admission Number */}
              <div className="space-y-1.5">
                <Label htmlFor="transfer-admission-input" className="text-xs font-semibold">
                  New Admission Number *
                </Label>
                <Input
                  id="transfer-admission-input"
                  placeholder="e.g. 2026/T001"
                  value={transferAdmissionNumber}
                  onChange={(e) => setTransferAdmissionNumber(e.target.value)}
                  required
                  disabled={isTransferPending}
                />
              </div>

              {/* New Class */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Assign to Class *</Label>
                <Select
                  value={transferClassId}
                  onValueChange={setTransferClassId}
                  disabled={isTransferPending}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.grade} - {cls.stream}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Info Alert */}
              <Alert className="bg-primary/5 border-primary/20">
                <Info className="h-4 w-4 text-primary" />
                <AlertDescription className="text-xs text-muted-foreground">
                  All SBA assessment records, pathway preferences, and pathway
                  allocations will be migrated to this school automatically.
                </AlertDescription>
              </Alert>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isTransferPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isTransferPending ||
                    !identifierValue.trim() ||
                    !transferAdmissionNumber.trim() ||
                    !transferClassId
                  }
                  className="gap-2"
                >
                  {isTransferPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Transferring...
                    </>
                  ) : (
                    <>
                      <ArrowLeftRight className="w-4 h-4" />
                      Admit Transfer
                    </>
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
