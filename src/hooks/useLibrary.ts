import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

export type LibraryBook = Tables<"library_books">;
export type LibrarySettings = Tables<"library_settings">;

export interface LibraryLoanRecord extends Tables<"library_loans"> {
  book: Pick<LibraryBook, "id" | "title" | "author" | "isbn" | "total_copies"> | null;
  student: {
    id: string;
    full_name: string;
    admission_number: string;
    classes: {
      grade: string;
      stream: string;
    } | null;
  } | null;
}

const invalidateLibraryQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ["library-books"] });
  queryClient.invalidateQueries({ queryKey: ["library-loans"] });
  queryClient.invalidateQueries({ queryKey: ["library-settings"] });
};

export function useLibrarySettings(enabled = true) {
  return useQuery({
    queryKey: ["library-settings"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("library_settings")
        .select("*")
        .maybeSingle();

      if (error) throw error;
      return data as LibrarySettings | null;
    },
  });
}

export function useLibraryBooks() {
  return useQuery({
    queryKey: ["library-books"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("library_books")
        .select("*")
        .order("title");

      if (error) throw error;
      return (data || []) as LibraryBook[];
    },
  });
}

export function useLibraryLoans(studentId?: string) {
  return useQuery({
    queryKey: ["library-loans", studentId || "all"],
    queryFn: async () => {
      let query = supabase
        .from("library_loans")
        .select(`
          *,
          book:library_books (id, title, author, isbn, total_copies),
          student:students (
            id,
            full_name,
            admission_number,
            classes:class_id (grade, stream)
          )
        `)
        .order("issued_at", { ascending: false });

      if (studentId) {
        query = query.eq("student_id", studentId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as unknown as LibraryLoanRecord[];
    },
    enabled: studentId !== "",
  });
}

export function useUpsertLibrarySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      loanPeriodDays,
      dailyPenaltyAmount,
    }: {
      loanPeriodDays: number;
      dailyPenaltyAmount: number;
    }) => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Not authenticated");

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (rolesError) throw rolesError;

      const canManageLibraryCharges = (roles || []).some(
        ({ role }) => role === "admin" || role === "librarian"
      );

      if (!canManageLibraryCharges) {
        throw new Error("Only admins and librarians can change library charges");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile?.school_id) throw new Error("No school is linked to this account");

      const { error } = await supabase
        .from("library_settings")
        .upsert(
          {
            school_id: profile.school_id,
            loan_period_days: loanPeriodDays,
            daily_penalty_amount: dailyPenaltyAmount,
          },
          { onConflict: "school_id" }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateLibraryQueries(queryClient);
      toast.success("Library settings updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update library settings");
    },
  });
}

export function useAddLibraryBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      title,
      author,
      isbn,
      totalCopies,
    }: {
      title: string;
      author: string;
      isbn?: string;
      totalCopies: number;
    }) => {
      const { error } = await supabase.from("library_books").insert({
        title,
        author,
        isbn: isbn?.trim() || null,
        total_copies: totalCopies,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateLibraryQueries(queryClient);
      toast.success("Book added to library");
    },
    onError: () => {
      toast.error("Failed to add book");
    },
  });
}

export function useIssueLibraryBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookId,
      studentId,
      dueDate,
      issueSource,
      issuedByUserId,
    }: {
      bookId: string;
      studentId: string;
      dueDate: string;
      issueSource: "librarian" | "teacher";
      issuedByUserId: string;
    }) => {
      const { error } = await supabase.from("library_loans").insert({
        book_id: bookId,
        student_id: studentId,
        due_date: dueDate,
        issue_source: issueSource,
        issued_by_user_id: issuedByUserId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateLibraryQueries(queryClient);
      toast.success("Book issued successfully");
    },
    onError: () => {
      toast.error("Failed to issue book");
    },
  });
}

export function useReturnLibraryBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ loanId, note }: { loanId: string; note?: string }) => {
      const { error } = await supabase
        .from("library_loans")
        .update({
          status: "returned",
          returned_at: new Date().toISOString(),
          return_notes: note?.trim() || null,
        })
        .eq("id", loanId);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateLibraryQueries(queryClient);
      toast.success("Book return recorded");
    },
    onError: () => {
      toast.error("Failed to record return");
    },
  });
}

export function useMarkLibraryBookLost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ loanId, note }: { loanId: string; note?: string }) => {
      const { error } = await supabase
        .from("library_loans")
        .update({
          status: "lost",
          lost_reported_at: new Date().toISOString(),
          lost_notes: note?.trim() || "Reported lost by student",
        })
        .eq("id", loanId);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateLibraryQueries(queryClient);
      toast.success("Book marked as lost");
    },
    onError: () => {
      toast.error("Failed to mark book as lost");
    },
  });
}
