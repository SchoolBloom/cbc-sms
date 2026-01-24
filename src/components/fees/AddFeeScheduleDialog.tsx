import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
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
import { useUpsertFeeSchedule } from "@/hooks/useFeeSchedules";

const feeScheduleSchema = z.object({
  grade: z.string().min(1, "Grade is required"),
  term: z.string().min(1, "Term is required"),
  academic_year: z.string().min(4, "Academic year is required"),
  amount: z.string().min(1, "Amount is required"),
});

type FeeScheduleForm = z.infer<typeof feeScheduleSchema>;

interface AddFeeScheduleDialogProps {
  trigger?: React.ReactNode;
}

export function AddFeeScheduleDialog({ trigger }: AddFeeScheduleDialogProps) {
  const [open, setOpen] = useState(false);
  const upsertSchedule = useUpsertFeeSchedule();

  const form = useForm<FeeScheduleForm>({
    resolver: zodResolver(feeScheduleSchema),
    defaultValues: {
      grade: "",
      term: "1",
      academic_year: new Date().getFullYear().toString(),
      amount: "",
    },
  });

  const onSubmit = (data: FeeScheduleForm) => {
    upsertSchedule.mutate(
      {
        grade: data.grade.trim(),
        term: Number(data.term),
        academic_year: data.academic_year.trim(),
        amount: Number(data.amount),
      },
      {
        onSuccess: () => {
          setOpen(false);
          form.reset({
            grade: "",
            term: "1",
            academic_year: new Date().getFullYear().toString(),
            amount: "",
          });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Fee Schedule
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Set Grade Fee</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="grade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grade</FormLabel>
                  <FormControl>
                    <Input placeholder="Grade 4" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="term"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Term</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} max={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="academic_year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Academic Year</FormLabel>
                  <FormControl>
                    <Input placeholder="2024" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (KES)</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} placeholder="45000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={upsertSchedule.isPending}>
                {upsertSchedule.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Schedule"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
