import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Plus, Loader2 } from "lucide-react";

const studentSchema = z.object({
  admission_number: z.string().min(1, "Admission number is required").max(20),
  full_name: z.string().min(2, "Name must be at least 2 characters").max(100),
  date_of_birth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["male", "female"], { required_error: "Please select gender" }),
  class_id: z.string().optional(),
  parent_id: z.string().optional(),
  medical_notes: z.string().max(500).optional(),
});

type StudentFormData = z.infer<typeof studentSchema>;

interface AddStudentDialogProps {
  trigger?: React.ReactNode;
}

export function AddStudentDialog({ trigger }: AddStudentDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      admission_number: "",
      full_name: "",
      date_of_birth: "",
      gender: undefined,
      class_id: "",
      parent_id: "",
      medical_notes: "",
    },
  });

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

  const createStudent = useMutation({
    mutationFn: async (data: StudentFormData) => {
      const { error } = await supabase.from("students").insert({
        admission_number: data.admission_number.trim(),
        full_name: data.full_name.trim(),
        date_of_birth: data.date_of_birth,
        gender: data.gender,
        class_id: data.class_id || null,
        parent_id: data.parent_id || null,
        medical_notes: data.medical_notes?.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Student added successfully");
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: StudentFormData) => {
    createStudent.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Student
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Student</DialogTitle>
          <DialogDescription>
            Enter the student's details. All fields marked with * are required.
          </DialogDescription>
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

            <FormField
              control={form.control}
              name="parent_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent/Guardian</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select parent/guardian" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {parents.map((parent) => (
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
              <Button type="submit" disabled={createStudent.isPending}>
                {createStudent.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Student"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
