import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Parent, useUpdateParent } from "@/hooks/useParents";

const parentSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters").max(100),
  phone: z.string().min(10, "Please enter a valid phone number").max(20),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  address: z.string().max(200).optional(),
  occupation: z.string().max(100).optional(),
});

type ParentFormData = z.infer<typeof parentSchema>;

interface EditParentDialogProps {
  parent: Parent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditParentDialog({ parent, open, onOpenChange }: EditParentDialogProps) {
  const updateParent = useUpdateParent();
  const form = useForm<ParentFormData>({
    resolver: zodResolver(parentSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      email: "",
      address: "",
      occupation: "",
    },
  });

  useEffect(() => {
    if (!parent) return;
    form.reset({
      full_name: parent.full_name,
      phone: parent.phone,
      email: parent.email || "",
      address: parent.address || "",
      occupation: parent.occupation || "",
    });
  }, [form, parent]);

  const onSubmit = (data: ParentFormData) => {
    if (!parent) return;
    updateParent.mutate(
      {
        id: parent.id,
        updates: {
          full_name: data.full_name.trim(),
          phone: data.phone.trim(),
          email: data.email?.trim() || null,
          address: data.address?.trim() || null,
          occupation: data.occupation?.trim() || null,
        },
      },
      {
        onSuccess: () => onOpenChange(false),
      }
    );
  };

  if (!parent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Edit Parent</DialogTitle>
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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateParent.isPending}>
                {updateParent.isPending ? (
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
