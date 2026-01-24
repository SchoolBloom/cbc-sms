import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";

const teacherSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  full_name: z.string().min(2, "Name must be at least 2 characters").max(100).optional(),
  phone: z.string().max(20).optional(),
});

type TeacherFormData = z.infer<typeof teacherSchema>;

interface AddTeacherDialogProps {
  trigger?: React.ReactNode;
}

export function AddTeacherDialog({ trigger }: AddTeacherDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<TeacherFormData>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      email: "",
      full_name: "",
      phone: "",
    },
  });

  const assignTeacher = useMutation({
    mutationFn: async (data: TeacherFormData) => {
      const normalizedEmail = data.email.trim().toLowerCase();

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, email, phone")
        .ilike("email", normalizedEmail)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) {
        throw new Error("No user found for that email. Ask the teacher to sign up first.");
      }

      const profileUpdates: Record<string, string> = {};
      if (data.full_name?.trim()) profileUpdates.full_name = data.full_name.trim();
      if (data.phone?.trim()) profileUpdates.phone = data.phone.trim();

      if (Object.keys(profileUpdates).length > 0) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update(profileUpdates)
          .eq("id", profile.id);
        if (updateError) throw updateError;
      }

      const { data: existingRole, error: roleCheckError } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", profile.user_id)
        .eq("role", "teacher")
        .maybeSingle();

      if (roleCheckError) throw roleCheckError;

      if (!existingRole) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: profile.user_id,
            role: "teacher",
          });
        if (roleError) throw roleError;
      }
    },
    onSuccess: () => {
      toast.success("Teacher added successfully");
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      setOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: TeacherFormData) => {
    assignTeacher.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Teacher
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Add Teacher</DialogTitle>
          <DialogDescription>
            Assign the Teacher role to an existing user account by email.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teacher Email *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="teacher@school.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Ms. Grace Wanjiru" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+254 712 345 678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={assignTeacher.isPending}>
                {assignTeacher.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Teacher"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
