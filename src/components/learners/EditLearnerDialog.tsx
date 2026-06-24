import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Learner, useUpdateLearner } from "@/hooks/useLearners";
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

interface EditLearnerDialogProps {
  learner: Learner | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditLearnerDialog({ learner, open, onOpenChange }: EditLearnerDialogProps) {
  const updateLearner = useUpdateLearner();

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
      parent_id: "",
      parent_id_secondary: "",
      medical_notes: "",
    },
  });

  useEffect(() => {
    if (!learner) return;
    form.reset({
      admission_number: learner.admission_number,
      assessment_number: learner.assessment_number || "",
      birth_certificate_number: learner.birth_certificate_number || "",
      upi_number: learner.upi_number || "",
      full_name: learner.full_name,
      date_of_birth: learner.date_of_birth,
      gender: learner.gender as "male" | "female",
      class_id: learner.class_id || "",
      pathway: learner.pathway || undefined,
      parent_id: learner.parent_id || "",
      parent_id_secondary: learner.parent_id_secondary || "",
      medical_notes: learner.medical_notes || "",
    });
  }, [form, learner]);
  const primaryParentId = form.watch("parent_id");
  const secondaryParentId = form.watch("parent_id_secondary");
  const selectedClassId = form.watch("class_id");

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
    enabled: open,
  });
  const selectedClass = classes.find((cls) => cls.id === selectedClassId);
  const requiresPathway = isSeniorSecondaryGrade(selectedClass?.grade);

  useEffect(() => {
    if (!requiresPathway) {
      form.setValue("pathway", undefined);
      form.clearErrors("pathway");
    }
  }, [form, requiresPathway]);

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
    enabled: open,
  });

  const onSubmit = (data: LearnerFormData) => {
    if (!learner) return;
    if (requiresPathway && !data.pathway) {
      form.setError("pathway", { message: "Pathway is required for Grade 10 to Grade 12 learners" });
      return;
    }
    updateLearner.mutate(
      {
        id: learner.id,
        updates: {
          admission_number: data.admission_number.trim(),
          assessment_number: data.assessment_number?.trim() || null,
          birth_certificate_number: data.birth_certificate_number?.trim() || null,
          upi_number: data.upi_number?.trim() || null,
          full_name: data.full_name.trim(),
          date_of_birth: data.date_of_birth,
          gender: data.gender,
          class_id: data.class_id || null,
          pathway: requiresPathway ? data.pathway || null : null,
          parent_id: data.parent_id || null,
          parent_id_secondary: data.parent_id_secondary || null,
          medical_notes: data.medical_notes?.trim() || null,
        },
      },
      {
        onSuccess: () => onOpenChange(false),
      }
    );
  };

  if (!learner) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Learner</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="birth_certificate_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Birth Certificate No. *</FormLabel>
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

            {requiresPathway && (
              <FormField
                control={form.control}
                name="pathway"
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
                      placeholder="Allergies, medications, etc."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateLearner.isPending}>
                {updateLearner.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
