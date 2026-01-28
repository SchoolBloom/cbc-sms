import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

const priorityOptions = ["low", "normal", "high", "urgent"] as const;
const audienceOptions = [
  { id: "all", label: "All" },
  { id: "parents", label: "Parents" },
  { id: "teachers", label: "Teachers" },
];

const noticeSchema = z.object({
  title: z.string().min(3, "Title is required"),
  content: z.string().min(10, "Content should be at least 10 characters"),
  priority: z.enum(priorityOptions),
  target_audience: z.array(z.string()).min(1, "Select at least one audience"),
  published: z.boolean(),
});

type NoticeForm = z.infer<typeof noticeSchema>;

type NoticeRecord = {
  id: string;
  title: string;
  content: string;
  priority: string;
  target_audience: string[] | null;
  published: boolean;
  published_at: string | null;
};

interface EditNoticeDialogProps {
  notice: NoticeRecord;
  trigger?: React.ReactNode;
}

export function EditNoticeDialog({ notice, trigger }: EditNoticeDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<NoticeForm>({
    resolver: zodResolver(noticeSchema),
    defaultValues: {
      title: notice.title,
      content: notice.content,
      priority: (notice.priority as NoticeForm["priority"]) || "normal",
      target_audience: notice.target_audience?.length ? notice.target_audience : ["all"],
      published: notice.published,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      title: notice.title,
      content: notice.content,
      priority: (notice.priority as NoticeForm["priority"]) || "normal",
      target_audience: notice.target_audience?.length ? notice.target_audience : ["all"],
      published: notice.published,
    });
  }, [form, notice, open]);

  const updateNotice = useMutation({
    mutationFn: async (data: NoticeForm) => {
      const isAll = data.target_audience.includes("all");
      const audience = isAll ? ["all"] : data.target_audience;
      const publishedAt = data.published
        ? notice.published_at || new Date().toISOString()
        : null;

      const { error } = await supabase
        .from("notices")
        .update({
          title: data.title.trim(),
          content: data.content.trim(),
          priority: data.priority,
          target_audience: audience,
          published: data.published,
          published_at: publishedAt,
        })
        .eq("id", notice.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notice updated");
      queryClient.invalidateQueries({ queryKey: ["notices"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-notices"] });
      setOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: NoticeForm) => {
    updateNotice.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="ghost" size="sm">Edit</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Notice</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Notice title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Write the notice details..." className="min-h-[120px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <FormControl>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      {...field}
                    >
                      {priorityOptions.map((option) => (
                        <option key={option} value={option}>
                          {option[0].toUpperCase() + option.slice(1)}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="target_audience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Audience</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {audienceOptions.map((audience) => {
                      const selected = field.value.includes(audience.id);
                      return (
                        <Button
                          key={audience.id}
                          type="button"
                          variant={selected ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            const next = selected
                              ? field.value.filter((item) => item !== audience.id)
                              : [...field.value, audience.id];
                            field.onChange(next);
                          }}
                        >
                          {audience.label}
                        </Button>
                      );
                    })}
                  </div>
                  {field.value.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {field.value.map((value) => (
                        <Badge key={value} variant="secondary">
                          {value}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="published"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                  <div>
                    <FormLabel>Publish now</FormLabel>
                    <p className="text-xs text-muted-foreground">If disabled, the notice will remain a draft.</p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateNotice.isPending}>
                {updateNotice.isPending ? (
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
