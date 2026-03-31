import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSchoolScope } from "@/hooks/useSchoolScope";
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
import { BookOpenCheck, Loader2 } from "lucide-react";

const librarianSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

type LibrarianFormData = z.infer<typeof librarianSchema>;

interface AssignLibrarianDialogProps {
  trigger?: React.ReactNode;
}

export function AssignLibrarianDialog({ trigger }: AssignLibrarianDialogProps) {
  const [open, setOpen] = useState(false);
  const { data: schoolScope } = useSchoolScope();
  const queryClient = useQueryClient();

  const form = useForm<LibrarianFormData>({
    resolver: zodResolver(librarianSchema),
    defaultValues: { email: "" },
  });

  const assignLibrarian = useMutation({
    mutationFn: async (data: LibrarianFormData) => {
      const normalizedEmail = data.email.trim().toLowerCase();

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id")
        .ilike("email", normalizedEmail)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) {
        throw new Error("No user found for that email. Ask the librarian to sign up first.");
      }

      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({
          email: normalizedEmail,
          ...(schoolScope?.schoolId ? { school_id: schoolScope.schoolId } : {}),
        })
        .eq("user_id", profile.user_id);
      if (profileUpdateError) throw profileUpdateError;

      const { data: existingRole, error: roleCheckError } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", profile.user_id)
        .eq("role", "librarian")
        .maybeSingle();

      if (roleCheckError) throw roleCheckError;

      if (!existingRole) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: profile.user_id, role: "librarian" });
        if (roleError) throw roleError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-school-scope"] });
      queryClient.invalidateQueries({ queryKey: ["school-profile"] });
      toast.success("Librarian role assigned");
      setOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: LibrarianFormData) => {
    assignLibrarian.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <BookOpenCheck className="w-4 h-4" />
            Assign Librarian Role
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Assign Librarian Role</DialogTitle>
          <DialogDescription>
            The user must already have an account. Enter their signup email.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="librarian@school.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={assignLibrarian.isPending}>
                {assignLibrarian.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  "Assign Role"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
