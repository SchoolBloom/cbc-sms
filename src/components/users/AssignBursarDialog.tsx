import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
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
import { ShieldCheck, Loader2 } from "lucide-react";

const bursarSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

type BursarFormData = z.infer<typeof bursarSchema>;

interface AssignBursarDialogProps {
  trigger?: React.ReactNode;
}

export function AssignBursarDialog({ trigger }: AssignBursarDialogProps) {
  const [open, setOpen] = useState(false);

  const form = useForm<BursarFormData>({
    resolver: zodResolver(bursarSchema),
    defaultValues: { email: "" },
  });

  const assignBursar = useMutation({
    mutationFn: async (data: BursarFormData) => {
      const normalizedEmail = data.email.trim().toLowerCase();

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id")
        .ilike("email", normalizedEmail)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) {
        throw new Error("No user found for that email. Ask the bursar to sign up first.");
      }

      const { data: existingRole, error: roleCheckError } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", profile.user_id)
        .eq("role", "bursar")
        .maybeSingle();

      if (roleCheckError) throw roleCheckError;

      if (!existingRole) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: profile.user_id, role: "bursar" });
        if (roleError) throw roleError;
      }
    },
    onSuccess: () => {
      toast.success("Bursar role assigned");
      setOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: BursarFormData) => {
    assignBursar.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <ShieldCheck className="w-4 h-4" />
            Assign Bursar Role
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Assign Bursar Role</DialogTitle>
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
                    <Input type="email" placeholder="bursar@school.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={assignBursar.isPending}>
                {assignBursar.isPending ? (
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
