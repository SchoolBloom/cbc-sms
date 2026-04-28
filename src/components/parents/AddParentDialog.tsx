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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";

const parentSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters").max(100),
  phone: z.string().min(10, "Please enter a valid phone number").max(20),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  address: z.string().max(200).optional(),
  occupation: z.string().max(100).optional(),
  national_id_number: z.string().max(50).optional(),
});

type ParentFormData = z.infer<typeof parentSchema>;

interface AddParentDialogProps {
  trigger?: React.ReactNode;
}

export function AddParentDialog({ trigger }: AddParentDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<ParentFormData>({
    resolver: zodResolver(parentSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      email: "",
      address: "",
      occupation: "",
      national_id_number: "",
    },
  });

  const createParent = useMutation({
    mutationFn: async (data: ParentFormData) => {
      const normalizedEmail = data.email?.trim().toLowerCase() || null;
      const { data: parentRow, error } = await supabase
        .from("parents")
        .insert({
          full_name: data.full_name.trim(),
          phone: data.phone.trim(),
          email: normalizedEmail,
          address: data.address?.trim() || null,
          occupation: data.occupation?.trim() || null,
          national_id_number: data.national_id_number?.trim() || null,
        })
        .select("id")
        .single();
      if (error) throw error;

      if (normalizedEmail && parentRow?.id) {
        const { data: profile, error: profileLookupError } = await supabase
          .from("profiles")
          .select("user_id")
          .ilike("email", normalizedEmail)
          .maybeSingle();
        if (profileLookupError) throw profileLookupError;
        if (profile) {
          const { error: profileError } = await supabase
            .from("profiles")
            .update({
              full_name: data.full_name.trim(),
              phone: data.phone.trim(),
              email: normalizedEmail,
            })
            .eq("user_id", profile.user_id);
          if (profileError) throw profileError;

          const { error: parentUpdateError } = await supabase
            .from("parents")
            .update({ user_id: profile.user_id, email: normalizedEmail })
            .eq("id", parentRow.id);
          if (parentUpdateError) throw parentUpdateError;
        }
      }
    },
    onSuccess: () => {
      toast.success("Parent/Guardian added successfully");
      queryClient.invalidateQueries({ queryKey: ["parents"] });
      setOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: ParentFormData) => {
    createParent.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Parent
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Add Parent/Guardian</DialogTitle>
          <DialogDescription>
            Enter parent or guardian details. Phone number is required for communication.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Mary Kamau" {...field} />
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
                  <FormLabel>Phone Number *</FormLabel>
                  <FormControl>
                    <Input placeholder="+254 712 345 678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="mary@email.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="occupation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Occupation</FormLabel>
                  <FormControl>
                    <Input placeholder="Teacher, Farmer, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="national_id_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>National ID Number</FormLabel>
                  <FormControl>
                    <Input placeholder="12345678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="P.O. Box 123, Nairobi"
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
              <Button type="submit" disabled={createParent.isPending}>
                {createParent.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Parent"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
