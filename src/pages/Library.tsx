import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useRole } from "@/contexts/RoleContext";
import {
  useAddLibraryBook,
  useIssueLibraryBook,
  useLibraryBooks,
  useLibraryLoans,
  useLibrarySettings,
  useMarkLibraryBookLost,
  useReturnLibraryBook,
  useUpsertLibrarySettings,
  type LibraryLoanRecord,
} from "@/hooks/useLibrary";
import { formatCurrency } from "@/hooks/useFees";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookOpen, Check, ChevronsUpDown, CircleAlert, Loader2, Package, ShieldAlert, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

type EffectiveLoanStatus = "issued" | "overdue" | "returned" | "lost";

function toDateValue(date: Date) {
  return date.toISOString().split("T")[0];
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function differenceInDays(start: Date, end: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / msPerDay));
}

function resolveLoanStatus(loan: LibraryLoanRecord, today: Date): EffectiveLoanStatus {
  if (loan.returned_at || loan.status === "returned") return "returned";
  if (loan.status === "lost") return "lost";

  const dueDate = new Date(`${loan.due_date}T00:00:00`);
  const isPastDue = dueDate < new Date(`${toDateValue(today)}T00:00:00`);

  if (loan.issue_source === "teacher" && isPastDue) return "lost";
  if (isPastDue) return "overdue";
  return "issued";
}

export default function Library() {
  const { user, selectedChildId, setSelectedChildId } = useRole();
  const [bookForm, setBookForm] = useState({
    title: "",
    author: "",
    isbn: "",
    totalCopies: "1",
  });
  const [settingsForm, setSettingsForm] = useState({
    loanPeriodDays: "14",
    dailyPenaltyAmount: "20",
  });
  const [issueForm, setIssueForm] = useState({
    bookId: "",
    admissionNumber: "",
    dueDate: toDateValue(addDays(new Date(), 14)),
    issueSource: user.role === "teacher" ? "teacher" : "librarian",
  });
  const [bookPickerOpen, setBookPickerOpen] = useState(false);

  const canManageInventory = user.role === "admin" || user.role === "librarian";
  const canManageSettings = canManageInventory;
  const canIssue = user.role === "admin" || user.role === "librarian" || user.role === "teacher";
  const selectedChild = user.children?.find((child) => child.id === selectedChildId);

  const today = new Date();

  const admissionNumberLookup = issueForm.admissionNumber.trim();

  const { data: matchedStudent, isLoading: studentLookupLoading } = useQuery({
    queryKey: ["library-student-lookup", admissionNumberLookup],
    enabled: canIssue && admissionNumberLookup.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name, admission_number, classes:class_id (grade, stream)")
        .eq("status", "active")
        .ilike("admission_number", admissionNumberLookup)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
  const { data: settings, isLoading: settingsLoading } = useLibrarySettings(user.role !== "parent");
  const { data: books = [], isLoading: booksLoading } = useLibraryBooks();
  const { data: loans = [], isLoading: loansLoading } = useLibraryLoans(
    user.role === "parent" ? selectedChildId || undefined : undefined
  );

  const addBook = useAddLibraryBook();
  const upsertSettings = useUpsertLibrarySettings();
  const issueBook = useIssueLibraryBook();
  const returnBook = useReturnLibraryBook();
  const markLost = useMarkLibraryBookLost();

  useEffect(() => {
    const period = settings?.loan_period_days || 14;
    setSettingsForm({
      loanPeriodDays: String(period),
      dailyPenaltyAmount: String(settings?.daily_penalty_amount || 20),
    });
    setIssueForm((current) => ({
      ...current,
      dueDate: toDateValue(addDays(new Date(), period)),
    }));
  }, [settings?.daily_penalty_amount, settings?.loan_period_days]);

  const enrichedLoans = useMemo(() => {
    return loans.map((loan) => {
      const effectiveStatus = resolveLoanStatus(loan, today);
      const dueDate = new Date(`${loan.due_date}T00:00:00`);
      const overdueDays = effectiveStatus === "overdue" ? differenceInDays(dueDate, today) : 0;
      const penaltyAmount =
        loan.issue_source === "librarian" && effectiveStatus === "overdue"
          ? overdueDays * Number(settings?.daily_penalty_amount || 0)
          : 0;

      return {
        ...loan,
        effectiveStatus,
        overdueDays,
        penaltyAmount,
      };
    });
  }, [loans, settings?.daily_penalty_amount, today]);

  const bookAvailability = useMemo(() => {
    const counts = new Map<string, { active: number; lost: number }>();

    enrichedLoans.forEach((loan) => {
      const current = counts.get(loan.book_id) || { active: 0, lost: 0 };
      if (loan.effectiveStatus === "issued" || loan.effectiveStatus === "overdue") {
        current.active += 1;
      }
      if (loan.effectiveStatus === "lost") {
        current.lost += 1;
      }
      counts.set(loan.book_id, current);
    });

    return counts;
  }, [enrichedLoans]);

  const bookRows = useMemo(() => {
    return books.map((book) => {
      const usage = bookAvailability.get(book.id) || { active: 0, lost: 0 };
      const availableCopies = Math.max(0, book.total_copies - usage.active - usage.lost);
      return {
        ...book,
        activeLoans: usage.active,
        lostCopies: usage.lost,
        availableCopies,
      };
    });
  }, [bookAvailability, books]);

  const activeLoans = enrichedLoans.filter((loan) => loan.effectiveStatus === "issued" || loan.effectiveStatus === "overdue");
  const overdueLoans = enrichedLoans.filter((loan) => loan.effectiveStatus === "overdue");
  const lostLoans = enrichedLoans.filter((loan) => loan.effectiveStatus === "lost");
  const totalCopies = bookRows.reduce((sum, book) => sum + book.total_copies, 0);
  const availableCopies = bookRows.reduce((sum, book) => sum + book.availableCopies, 0);

  const handleAddBook = () => {
    addBook.mutate(
      {
        title: bookForm.title.trim(),
        author: bookForm.author.trim(),
        isbn: bookForm.isbn.trim(),
        totalCopies: Number(bookForm.totalCopies),
      },
      {
        onSuccess: () => {
          setBookForm({ title: "", author: "", isbn: "", totalCopies: "1" });
        },
      }
    );
  };

  const handleSaveSettings = () => {
    upsertSettings.mutate({
      loanPeriodDays: Number(settingsForm.loanPeriodDays),
      dailyPenaltyAmount: Number(settingsForm.dailyPenaltyAmount),
    });
  };

  const handleIssueBook = () => {
    if (!matchedStudent) {
      toast.error("Enter a valid active student admission number");
      return;
    }

    issueBook.mutate(
      {
        bookId: issueForm.bookId,
        studentId: matchedStudent.id,
        dueDate: issueForm.dueDate,
        issueSource: issueForm.issueSource as "librarian" | "teacher",
        issuedByUserId: user.id,
      },
      {
        onSuccess: () => {
          setIssueForm({
            bookId: "",
            admissionNumber: "",
            dueDate: toDateValue(addDays(new Date(), settings?.loan_period_days || 14)),
            issueSource: user.role === "teacher" ? "teacher" : "librarian",
          });
        },
      }
    );
  };

  const getStatusBadge = (status: EffectiveLoanStatus) => {
    if (status === "returned") return "bg-success/10 text-success border-success/20";
    if (status === "lost") return "bg-destructive/10 text-destructive border-destructive/20";
    if (status === "overdue") return "bg-warning/10 text-warning border-warning/20";
    return "bg-primary/10 text-primary border-primary/20";
  };

  if (user.role === "parent") {
    return (
      <DashboardLayout>
        <div className="page-header">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="page-title font-display">Library Record</h1>
              <p className="page-subtitle">View books issued to your child and their current status.</p>
            </div>
            {user.children && user.children.length > 1 && (
              <Select value={selectedChildId || ""} onValueChange={(value) => setSelectedChildId(value)}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {user.children.map((child) => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border/50 p-6 mb-6">
          <h2 className="text-lg font-display font-semibold text-foreground">
            {selectedChild?.full_name || "Student record not linked"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedChild?.classes
              ? `${selectedChild.classes.grade} ${selectedChild.classes.stream}`
              : "Grade unavailable"}{" "}
            • Admission No: {selectedChild?.admission_number || "N/A"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-card rounded-xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">Currently Issued</p>
            <p className="text-2xl font-bold">{activeLoans.length}</p>
          </div>
          <div className="bg-card rounded-xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">Penalty Balance</p>
            <p className="text-2xl font-bold">{formatCurrency(overdueLoans.reduce((sum, loan) => sum + loan.penaltyAmount, 0))}</p>
          </div>
          <div className="bg-card rounded-xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">Lost Books</p>
            <p className="text-2xl font-bold">{lostLoans.length}</p>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-display font-semibold text-foreground">Issued Books</h3>
          </div>
          <div className="divide-y divide-border">
            {loansLoading ? (
              <div className="px-5 py-8 flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : enrichedLoans.length > 0 ? (
              enrichedLoans.map((loan) => (
                <div key={loan.id} className="px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-foreground">{loan.book?.title || "Book record"}</p>
                    <p className="text-sm text-muted-foreground">
                      {loan.book?.author || "Author unavailable"} • Due {new Date(loan.due_date).toLocaleDateString("en-KE")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {loan.penaltyAmount > 0 && (
                      <p className="text-sm font-medium text-warning">
                        Penalty {formatCurrency(loan.penaltyAmount)}
                      </p>
                    )}
                    <Badge variant="outline" className={getStatusBadge(loan.effectiveStatus)}>
                      {loan.effectiveStatus}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center text-muted-foreground">
                No library records found for this student.
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title font-display">Library Management</h1>
            <p className="page-subtitle">Manage books, issues, returns, penalties, and lost-book tracking.</p>
          </div>
          {settings && (
            <Badge variant="outline" className="w-fit">
              Librarian terms: {settings.loan_period_days} days • {formatCurrency(Number(settings.daily_penalty_amount))}/day
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Titles</p>
            <p className="text-lg font-bold">{bookRows.length}</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-success" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Available Copies</p>
            <p className="text-lg font-bold">{availableCopies} of {totalCopies}</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-warning" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Penalty Exposure</p>
            <p className="text-lg font-bold">{formatCurrency(overdueLoans.reduce((sum, loan) => sum + loan.penaltyAmount, 0))}</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Lost Books</p>
            <p className="text-lg font-bold">{lostLoans.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {canManageSettings && (
          <div className="bg-card rounded-xl border border-border/50 p-5 space-y-4">
            <div>
              <h3 className="font-display font-semibold text-foreground">Library Charges</h3>
              <p className="text-sm text-muted-foreground">Only admins and librarians can change due-date rules and overdue daily charges for librarian-issued books.</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground">Loan period (days)</label>
                <Input
                  type="number"
                  min="1"
                  value={settingsForm.loanPeriodDays}
                  onChange={(e) => setSettingsForm((prev) => ({ ...prev, loanPeriodDays: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Penalty per overdue day</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={settingsForm.dailyPenaltyAmount}
                  onChange={(e) => setSettingsForm((prev) => ({ ...prev, dailyPenaltyAmount: e.target.value }))}
                />
              </div>
              <Button onClick={handleSaveSettings} disabled={upsertSettings.isPending || settingsLoading}>
                {upsertSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Charges"}
              </Button>
            </div>
          </div>
        )}

        {canManageInventory && (
          <div className="bg-card rounded-xl border border-border/50 p-5 space-y-4">
            <div>
              <h3 className="font-display font-semibold text-foreground">Add Book</h3>
              <p className="text-sm text-muted-foreground">Register new titles and the number of copies on hand.</p>
            </div>
            <div className="space-y-3">
              <Input
                placeholder="Book title"
                value={bookForm.title}
                onChange={(e) => setBookForm((prev) => ({ ...prev, title: e.target.value }))}
              />
              <Input
                placeholder="Author"
                value={bookForm.author}
                onChange={(e) => setBookForm((prev) => ({ ...prev, author: e.target.value }))}
              />
              <Input
                placeholder="ISBN (optional)"
                value={bookForm.isbn}
                onChange={(e) => setBookForm((prev) => ({ ...prev, isbn: e.target.value }))}
              />
              <Input
                type="number"
                min="1"
                placeholder="Total copies"
                value={bookForm.totalCopies}
                onChange={(e) => setBookForm((prev) => ({ ...prev, totalCopies: e.target.value }))}
              />
              <Button
                onClick={handleAddBook}
                disabled={
                  addBook.isPending ||
                  !bookForm.title.trim() ||
                  !bookForm.author.trim() ||
                  Number(bookForm.totalCopies) < 1
                }
              >
                {addBook.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Book"}
              </Button>
            </div>
          </div>
        )}

        {canIssue && (
          <div className="bg-card rounded-xl border border-border/50 p-5 space-y-4">
            <div>
              <h3 className="font-display font-semibold text-foreground">Issue Book</h3>
              <p className="text-sm text-muted-foreground">Teachers can issue class books. Librarian-issued books accrue penalties after the due date.</p>
            </div>
            <div className="space-y-3">
              {user.role === "admin" && (
                <Select
                  value={issueForm.issueSource}
                  onValueChange={(value) => setIssueForm((prev) => ({ ...prev, issueSource: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Issue source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="librarian">Librarian issue</SelectItem>
                    <SelectItem value="teacher">Teacher issue</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Popover open={bookPickerOpen} onOpenChange={setBookPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={bookPickerOpen}
                    className="w-full justify-between font-normal"
                  >
                    {issueForm.bookId
                      ? (() => {
                          const selectedBook = bookRows.find((book) => book.id === issueForm.bookId);
                          return selectedBook
                            ? `${selectedBook.title} (${selectedBook.availableCopies} available)`
                            : "Select book";
                        })()
                      : "Search book"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search books..." />
                    <CommandList>
                      <CommandEmpty>No books found.</CommandEmpty>
                      {bookRows.map((book) => (
                        <CommandItem
                          key={book.id}
                          value={`${book.title} ${book.author} ${book.isbn || ""}`}
                          disabled={book.availableCopies < 1}
                          onSelect={() => {
                            setIssueForm((prev) => ({ ...prev, bookId: book.id }));
                            setBookPickerOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              issueForm.bookId === book.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                            <span className="truncate">{book.title}</span>
                            <span className="text-xs text-muted-foreground">
                              {book.availableCopies} available
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <div className="space-y-2">
                <Input
                  placeholder="Enter admission number"
                  value={issueForm.admissionNumber}
                  onChange={(e) =>
                    setIssueForm((prev) => ({ ...prev, admissionNumber: e.target.value.toUpperCase() }))
                  }
                />
                {studentLookupLoading ? (
                  <p className="text-xs text-muted-foreground">Looking up student...</p>
                ) : matchedStudent ? (
                  <div className="rounded-lg border border-border/50 bg-muted/40 px-3 py-2 text-sm">
                    <p className="font-medium text-foreground">{matchedStudent.full_name}</p>
                    <p className="text-muted-foreground">
                      {matchedStudent.admission_number}
                      {matchedStudent.classes
                        ? ` • ${matchedStudent.classes.grade} ${matchedStudent.classes.stream}`
                        : ""}
                    </p>
                  </div>
                ) : admissionNumberLookup ? (
                  <p className="text-xs text-muted-foreground">No active student found for that admission number.</p>
                ) : null}
              </div>
              <Input
                type="date"
                value={issueForm.dueDate}
                onChange={(e) => setIssueForm((prev) => ({ ...prev, dueDate: e.target.value }))}
              />
              <Button
                onClick={handleIssueBook}
                disabled={
                  issueBook.isPending ||
                  !issueForm.bookId ||
                  !admissionNumberLookup ||
                  studentLookupLoading ||
                  !matchedStudent ||
                  !issueForm.dueDate
                }
              >
                {issueBook.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Issue Book"}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-display font-semibold text-foreground">Inventory</h3>
          </div>
          {(booksLoading || loansLoading) ? (
            <div className="px-5 py-8 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : bookRows.length > 0 ? (
            <div className="divide-y divide-border">
              {bookRows.map((book) => (
                <div key={book.id} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-foreground">{book.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {book.author} {book.isbn ? `• ISBN ${book.isbn}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{book.availableCopies}/{book.total_copies} available</p>
                    <p className="text-xs text-muted-foreground">
                      {book.activeLoans} issued • {book.lostCopies} lost
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-8 text-center text-muted-foreground">
              No books have been added yet.
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-display font-semibold text-foreground">Loan Register</h3>
          </div>
          {(loansLoading || booksLoading) ? (
            <div className="px-5 py-8 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : enrichedLoans.length > 0 ? (
            <div className="divide-y divide-border">
              {enrichedLoans.map((loan) => {
                const canReturn = loan.effectiveStatus === "issued" || loan.effectiveStatus === "overdue";
                const canMarkLost =
                  canManageSettings &&
                  loan.issue_source === "librarian" &&
                  loan.effectiveStatus !== "returned" &&
                  loan.effectiveStatus !== "lost";

                return (
                  <div key={loan.id} className="px-5 py-4 space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-foreground">{loan.book?.title || "Book record"}</p>
                        <p className="text-sm text-muted-foreground">
                          {loan.student?.full_name || "Student"}{" "}
                          {loan.student?.classes ? `• ${loan.student.classes.grade} ${loan.student.classes.stream}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Issued by {loan.issue_source} • Due {new Date(loan.due_date).toLocaleDateString("en-KE")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {loan.effectiveStatus === "overdue" && (
                          <div className="text-right">
                            <p className="text-sm font-medium text-warning">{loan.overdueDays} day(s) overdue</p>
                            <p className="text-xs text-muted-foreground">
                              Penalty {formatCurrency(loan.penaltyAmount)}
                            </p>
                          </div>
                        )}
                        {loan.issue_source === "teacher" && loan.effectiveStatus === "lost" && loan.status !== "lost" && (
                          <div className="flex items-center gap-1 text-xs text-destructive">
                            <CircleAlert className="w-3.5 h-3.5" />
                            Auto-lost after due date
                          </div>
                        )}
                        <Badge variant="outline" className={getStatusBadge(loan.effectiveStatus)}>
                          {loan.effectiveStatus}
                        </Badge>
                      </div>
                    </div>
                    {(canReturn || canMarkLost) && (
                      <div className="flex gap-2">
                        {canReturn && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => returnBook.mutate({ loanId: loan.id })}
                            disabled={returnBook.isPending}
                          >
                            Record Return
                          </Button>
                        )}
                        {canMarkLost && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markLost.mutate({ loanId: loan.id })}
                            disabled={markLost.isPending}
                          >
                            Mark Lost
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-8 text-center text-muted-foreground">
              No loan records yet.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
