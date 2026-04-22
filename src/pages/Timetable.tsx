import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useAcademicYear } from "@/hooks/useAcademicYear";
import { useTimetables, useTeacherTimetable, useCreateTimetable, useUpdateTimetableSlots, useDeleteTimetable, getDayName, formatTimetableByDay, formatTeacherTimetableByDay, type TimetableSlotInput, type Timetable } from "@/hooks/useTimetables";
import { useTeachers } from "@/hooks/useTeachers";
import { useSubjects } from "@/hooks/useSubjects";
import { useClasses } from "@/hooks/useClasses";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, FileDown, Plus, Trash2, Loader2, Calendar, Clock, BookOpen, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Days of the week
const DAYS = [1, 2, 3, 4, 5, 6, 7]; // Monday to Sunday
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8]; // Periods 1-8

function downloadBlob(filename: string, content: BlobPart, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeCsv(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  const escaped = text.replaceAll('"', '""');
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

async function ensurePdfDeps() {
  const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  // jspdf-autotable registers itself globally on jsPDF in many builds, but to be safe we return it too.
  const autoTable = (autoTableModule as any).default || (autoTableModule as any);
  return { jsPDF, autoTable };
}

function formatTimeRange(start?: string | null, end?: string | null) {
  if (!start || !end) return "";
  return `${start}–${end}`;
}

async function downloadClassTimetablePdf(timetable: Timetable) {
  const { jsPDF, autoTable } = await ensurePdfDeps();
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  const title = `Class Timetable`;
  const subtitle = `${timetable.grade}${timetable.stream ? ` - ${timetable.stream}` : ""} • ${timetable.academic_year} Term ${timetable.term}`;

  doc.setFontSize(16);
  doc.text(title, 40, 48);
  doc.setFontSize(11);
  doc.text(subtitle, 40, 68);

  const slots = (timetable.timetable_slots || []).slice().sort((a, b) => {
    if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
    return a.period_number - b.period_number;
  });

  const body = slots.map((s) => [
    getDayName(s.day_of_week),
    `Period ${s.period_number}`,
    formatTimeRange(s.start_time, s.end_time),
    s.slot_type === "break" ? (s.label || "Break") : s.subject,
    s.slot_type === "break" ? "" : (s.teachers?.full_name || ""),
    s.slot_type === "break" ? "" : (s.room || ""),
  ]);

  autoTable(doc, {
    startY: 86,
    head: [["Day", "Period", "Time", "Subject / Break", "Teacher", "Room"]],
    body,
    styles: { fontSize: 9, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [17, 24, 39] },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 72 },
      2: { cellWidth: 70 },
      3: { cellWidth: 150 },
      4: { cellWidth: 110 },
      5: { cellWidth: 60 },
    },
    didParseCell: (data: any) => {
      const row = data.row?.raw;
      // Shade break rows lightly by checking Subject/Break column text.
      if (data.section === "body" && Array.isArray(row)) {
        const subject = row[3];
        if (typeof subject === "string" && subject.toLowerCase().includes("break")) {
          data.cell.styles.fillColor = [249, 250, 251];
        }
      }
    },
  });

  doc.save(`timetable-${timetable.grade}-${timetable.stream || "all"}-${timetable.academic_year}-term${timetable.term}.pdf`);
}

async function downloadTeacherSchedulePdf(params: {
  teacherName: string;
  academicYear: string;
  termLabel: string;
  rows: Array<{
    day_of_week: number;
    period_number: number;
    start_time?: string | null;
    end_time?: string | null;
    subject: string;
    classLabel: string;
    room?: string | null;
  }>;
  filename: string;
}) {
  const { jsPDF, autoTable } = await ensurePdfDeps();
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  doc.setFontSize(16);
  doc.text("Teacher Timetable", 40, 48);
  doc.setFontSize(11);
  doc.text(`${params.teacherName} • ${params.academicYear} • Term ${params.termLabel}`, 40, 68);

  const body = params.rows.map((s) => [
    getDayName(s.day_of_week),
    `Period ${s.period_number}`,
    formatTimeRange(s.start_time, s.end_time),
    s.subject,
    s.classLabel,
    s.room || "",
  ]);

  autoTable(doc, {
    startY: 86,
    head: [["Day", "Period", "Time", "Subject", "Class", "Room"]],
    body,
    styles: { fontSize: 9, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [17, 24, 39] },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 72 },
      2: { cellWidth: 70 },
      3: { cellWidth: 150 },
      4: { cellWidth: 95 },
      5: { cellWidth: 60 },
    },
  });

  doc.save(params.filename);
}

function downloadClassTimetableCsv(timetable: Timetable) {
  const slots = (timetable.timetable_slots || []).slice().sort((a, b) => {
    if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
    return a.period_number - b.period_number;
  });

  const rows = [
    ["Grade", timetable.grade],
    ["Stream", timetable.stream || ""],
    ["Academic Year", timetable.academic_year],
    ["Term", String(timetable.term)],
    [],
    ["Day", "Period", "Subject", "Teacher", "Room"],
    ...slots.map((s) => [
      getDayName(s.day_of_week),
      String(s.period_number),
      s.subject,
      s.teachers?.full_name || "",
      s.room || "",
    ]),
  ];

  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  downloadBlob(
    `timetable-${timetable.grade}-${timetable.stream || "all"}-${timetable.academic_year}-term${timetable.term}.csv`,
    csv,
    "text/csv;charset=utf-8"
  );
}

function CreateTimetableDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("1");
  const [slots, setSlots] = useState<TimetableSlotInput[]>([]);
  
  const { data: academicYearData } = useAcademicYear();
  const academicYear = academicYearData?.label || "2025";
  const createTimetable = useCreateTimetable();
  const { data: teachers = [] } = useTeachers();
  const { data: subjects = [] } = useSubjects();
  const { data: classes = [] } = useClasses();
  
  // Get unique grades from classes
  const uniqueGrades = useMemo(() => {
    const grades = new Set(classes.map(c => c.grade));
    return Array.from(grades).sort();
  }, [classes]);
  
  // Get streams for selected grade
  const streamsForGrade = useMemo(() => {
    if (!selectedClassId) return [];
    const cls = classes.find(c => c.id === selectedClassId);
    return cls ? [cls.stream] : [];
  }, [selectedClassId, classes]);
  
  const subjectOptions = useMemo(() => {
    if (subjects.length > 0) {
      return subjects.map(s => s.name);
    }
    // Default subjects if none defined
    return ["English", "Kiswahili", "Mathematics", "Science", "Social Studies", "Religious Education", "Physical Education", "Art", "Music", "Agriculture", "Home Science", "Business Studies"];
  }, [subjects]);

  const addSlot = () => {
    try {
      const newSlot: TimetableSlotInput = { day_of_week: 1, period_number: 1, slot_type: "lesson" };
      setSlots([...slots, newSlot]);
    } catch (error) {
      console.error("Error adding slot:", error);
    }
  };

  const updateSlot = (index: number, field: keyof TimetableSlotInput, value: any) => {
    const newSlots = [...slots];
    (newSlots[index] as any)[field] = value === "" ? undefined : value;
    setSlots(newSlots);
  };

  const removeSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!selectedClassId) return;
    
    const selectedClass = classes.find(c => c.id === selectedClassId);
    if (!selectedClass) return;
    
    createTimetable.mutate({
      grade: selectedClass.grade,
      stream: selectedClass.stream,
      academic_year: academicYear,
      term: parseInt(selectedTerm),
      slots: slots.filter(s => s.subject),
    }, {
      onSuccess: () => {
        setOpen(false);
        setSelectedClassId("");
        setSelectedTerm("1");
        setSlots([]);
        onSuccess?.();
      },
      onError: (error) => {
        console.error("Failed to create timetable:", error);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Create Timetable
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-[1100px] h-[95vh] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Class Timetable</DialogTitle>
          <DialogDescription>Create a new timetable for a class.</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Class *</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.grade} - {cls.stream}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Term</Label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Term 1</SelectItem>
                  <SelectItem value="2">Term 2</SelectItem>
                  <SelectItem value="3">Term 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border rounded-md p-4">
            <div className="flex justify-between items-center mb-4">
              <Label>Time Slots</Label>
              <Button type="button" variant="outline" size="sm" onClick={addSlot}>
                <Plus className="w-4 h-4 mr-1" /> Add Slot
              </Button>
            </div>
            
            {slots.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No slots added. Click "Add Slot" to add timetable entries.
              </p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {slots.map((slot, index) => (
                  <div key={index} className="flex gap-2 items-start p-2 border rounded bg-muted/30">
                    <Select
                      value={slot.slot_type || "lesson"}
                      onValueChange={(v) => {
                        const next = v as "lesson" | "break";
                        updateSlot(index, "slot_type", next);
                        if (next === "break") {
                          updateSlot(index, "teacher_id", undefined);
                          updateSlot(index, "room", undefined);
                          if (!slot.label) updateSlot(index, "label", "Break");
                          if (!slot.subject) updateSlot(index, "subject", "Break");
                        }
                      }}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lesson">Lesson</SelectItem>
                        <SelectItem value="break">Break</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select 
                      value={slot.day_of_week.toString()} 
                      onValueChange={(v) => updateSlot(index, 'day_of_week', parseInt(v))}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS.map(d => (
                          <SelectItem key={d} value={d.toString()}>{getDayName(d)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select 
                      value={slot.period_number.toString()} 
                      onValueChange={(v) => updateSlot(index, 'period_number', parseInt(v))}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PERIODS.map(p => (
                          <SelectItem key={p} value={p.toString()}>Period {p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select 
                      value={slot.subject || ""} 
                      onValueChange={(v) => updateSlot(index, 'subject', v)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjectOptions.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {slot.slot_type === "break" ? (
                      <Input
                        placeholder="Break label (e.g. Lunch)"
                        value={slot.label || ""}
                        onChange={(e) => updateSlot(index, "label", e.target.value)}
                        className="w-[220px]"
                      />
                    ) : null}
                    <Select 
                      value={slot.teacher_id || ""} 
                      onValueChange={(v) => updateSlot(index, 'teacher_id', v === "none" ? undefined : v)}
                      disabled={slot.slot_type === "break"}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {teachers.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input 
                      placeholder="Room"
                      value={slot.room || ""}
                      onChange={(e) => updateSlot(index, 'room', e.target.value)}
                      className="w-[80px]"
                      disabled={slot.slot_type === "break"}
                    />
                    <Input
                      type="time"
                      value={slot.start_time || ""}
                      onChange={(e) => updateSlot(index, "start_time", e.target.value)}
                      className="w-[120px]"
                      aria-label="Start time"
                      title="Start time"
                    />
                    <Input
                      type="time"
                      value={slot.end_time || ""}
                      onChange={(e) => updateSlot(index, "end_time", e.target.value)}
                      className="w-[120px]"
                      aria-label="End time"
                      title="End time"
                    />
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeSlot(index)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createTimetable.isPending || !selectedClassId}>
              {createTimetable.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Create Timetable
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditTimetableDialog({ timetable, onSuccess }: { timetable: Timetable; onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [slots, setSlots] = useState<TimetableSlotInput[]>(
    timetable.timetable_slots?.map(s => ({
      day_of_week: s.day_of_week,
      period_number: s.period_number,
      subject: s.subject,
      teacher_id: s.teacher_id || undefined,
      room: s.room || undefined,
      start_time: s.start_time || undefined,
      end_time: s.end_time || undefined,
      slot_type: s.slot_type || "lesson",
      label: s.label || undefined,
    })) || []
  );
  
  const updateSlots = useUpdateTimetableSlots();
  const { data: teachers = [] } = useTeachers();
  const { data: subjects = [] } = useSubjects();
  
  const subjectOptions = useMemo(() => {
    if (subjects.length > 0) {
      return subjects.map(s => s.name);
    }
    return ["English", "Kiswahili", "Mathematics", "Science", "Social Studies", "Religious Education", "Physical Education", "Art", "Music", "Agriculture", "Home Science", "Business Studies"];
  }, [subjects]);

  const addSlot = () => {
    try {
      const newSlot: TimetableSlotInput = { day_of_week: 1, period_number: 1, slot_type: "lesson" };
      setSlots([...slots, newSlot]);
    } catch (error) {
      console.error("Error adding slot:", error);
    }
  };

  const updateSlot = (index: number, field: keyof TimetableSlotInput, value: any) => {
    const newSlots = [...slots];
    (newSlots[index] as any)[field] = value === "" ? undefined : value;
    setSlots(newSlots);
  };

  const removeSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    updateSlots.mutate({
      timetableId: timetable.id,
      slots: slots.filter(s => s.subject),
    }, {
      onSuccess: () => {
        setOpen(false);
        onSuccess?.();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Edit</Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-[1100px] h-[95vh] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Timetable - {timetable.grade}{timetable.stream ? ` ${timetable.stream}` : ''}</DialogTitle>
          <DialogDescription>Update the timetable for {timetable.academic_year} Term {timetable.term}.</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="border rounded-md p-4">
            <div className="flex justify-between items-center mb-4">
              <Label>Time Slots</Label>
              <Button type="button" variant="outline" size="sm" onClick={addSlot}>
                <Plus className="w-4 h-4 mr-1" /> Add Slot
              </Button>
            </div>
            
            {slots.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No slots added. Click "Add Slot" to add timetable entries.
              </p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {slots.map((slot, index) => (
                  <div key={index} className="flex gap-2 items-start p-2 border rounded bg-muted/30">
                    <Select
                      value={slot.slot_type || "lesson"}
                      onValueChange={(v) => {
                        const next = v as "lesson" | "break";
                        updateSlot(index, "slot_type", next);
                        if (next === "break") {
                          updateSlot(index, "teacher_id", undefined);
                          updateSlot(index, "room", undefined);
                          if (!slot.label) updateSlot(index, "label", "Break");
                          if (!slot.subject) updateSlot(index, "subject", "Break");
                        }
                      }}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lesson">Lesson</SelectItem>
                        <SelectItem value="break">Break</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select 
                      value={slot.day_of_week.toString()} 
                      onValueChange={(v) => updateSlot(index, 'day_of_week', parseInt(v))}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS.map(d => (
                          <SelectItem key={d} value={d.toString()}>{getDayName(d)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select 
                      value={slot.period_number.toString()} 
                      onValueChange={(v) => updateSlot(index, 'period_number', parseInt(v))}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PERIODS.map(p => (
                          <SelectItem key={p} value={p.toString()}>Period {p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select 
                      value={slot.subject || ""} 
                      onValueChange={(v) => updateSlot(index, 'subject', v)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjectOptions.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {slot.slot_type === "break" ? (
                      <Input
                        placeholder="Break label (e.g. Lunch)"
                        value={slot.label || ""}
                        onChange={(e) => updateSlot(index, "label", e.target.value)}
                        className="w-[220px]"
                      />
                    ) : null}
                    <Select 
                      value={slot.teacher_id || ""} 
                      onValueChange={(v) => updateSlot(index, 'teacher_id', v === "none" ? undefined : v)}
                      disabled={slot.slot_type === "break"}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {teachers.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input 
                      placeholder="Room"
                      value={slot.room || ""}
                      onChange={(e) => updateSlot(index, 'room', e.target.value)}
                      className="w-[80px]"
                      disabled={slot.slot_type === "break"}
                    />
                    <Input
                      type="time"
                      value={slot.start_time || ""}
                      onChange={(e) => updateSlot(index, "start_time", e.target.value)}
                      className="w-[120px]"
                      aria-label="Start time"
                      title="Start time"
                    />
                    <Input
                      type="time"
                      value={slot.end_time || ""}
                      onChange={(e) => updateSlot(index, "end_time", e.target.value)}
                      className="w-[120px]"
                      aria-label="End time"
                      title="End time"
                    />
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeSlot(index)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={updateSlots.isPending}>
              {updateSlots.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TimetableView({ timetable }: { timetable: Timetable }) {
  const deleteTimetable = useDeleteTimetable();
  const { toast } = useToast();
  
  const slots = timetable.timetable_slots || [];
  const slotsByDay = formatTimetableByDay(slots);

  const handleDownloadCsv = () => {
    downloadClassTimetableCsv(timetable);
    toast({ title: "Downloaded CSV" });
  };

  const handleDownloadPdf = async () => {
    await downloadClassTimetablePdf(timetable);
    toast({ title: "Downloaded PDF" });
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this timetable?")) {
      deleteTimetable.mutate(timetable.id);
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">
              {timetable.grade}{timetable.stream ? ` - ${timetable.stream}` : ''}
            </CardTitle>
            <CardDescription>
              {timetable.academic_year} Term {timetable.term}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
              <Download className="w-4 h-4 mr-1" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadCsv}>
              <FileDown className="w-4 h-4 mr-1" /> CSV
            </Button>
            <EditTimetableDialog timetable={timetable} />
            <Button variant="ghost" size="sm" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          {DAYS.map(day => {
            const daySlots = slotsByDay[day] || [];
            if (daySlots.length === 0) return null;
            
            return (
              <div key={day} className="border rounded-md p-3">
                <div className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {getDayName(day)}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {daySlots.sort((a, b) => a.period_number - b.period_number).map((slot, idx) => (
                    <div key={idx} className="bg-muted/50 rounded p-2 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground mb-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          Period {slot.period_number}
                          {slot.start_time && slot.end_time ? ` • ${slot.start_time}–${slot.end_time}` : ""}
                        </span>
                      </div>
                      <div className="font-medium flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {slot.slot_type === "break" ? (slot.label || "Break") : slot.subject}
                      </div>
                      {slot.teachers && (
                        <div className="text-muted-foreground text-xs flex items-center gap-1 mt-1">
                          <User className="w-3 h-3" />
                          {slot.teachers.full_name}
                        </div>
                      )}
                      {slot.room && (
                        <div className="text-muted-foreground text-xs mt-1">
                          Room: {slot.room}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function TeacherTimetableView() {
  const { data: academicYearData } = useAcademicYear();
  const academicYear = academicYearData?.label || "2025";
  const [selectedTerm, setSelectedTerm] = useState("1");
  const { data: slots, isLoading } = useTeacherTimetable({ 
    academic_year: academicYear, 
    term: parseInt(selectedTerm) 
  });

  const slotsByDay = useMemo(() => {
    if (!slots) return {};
    return formatTeacherTimetableByDay(slots);
  }, [slots]);

  const handleDownloadCsv = () => {
    if (!slots || slots.length === 0) return;
    const sorted = slots.slice().sort((a, b) => {
      if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
      return a.period_number - b.period_number;
    });
    const rows = [
      ["Academic Year", academicYear],
      ["Term", selectedTerm],
      [],
      ["Day", "Period", "Subject", "Class", "Room"],
      ...sorted.map((s) => [
        getDayName(s.day_of_week),
        String(s.period_number),
        s.subject,
        `${s.timetables.grade}${s.timetables.stream ? ` ${s.timetables.stream}` : ""}`,
        s.room || "",
      ]),
    ];
    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
    downloadBlob(`my-timetable-${academicYear}-term${selectedTerm}.csv`, csv, "text/csv;charset=utf-8");
  };

  const handleDownloadPdf = async () => {
    if (!slots || slots.length === 0) return;
    const sorted = slots.slice().sort((a, b) => {
      if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
      return a.period_number - b.period_number;
    });

    await downloadTeacherSchedulePdf({
      teacherName: "My Timetable",
      academicYear,
      termLabel: selectedTerm,
      rows: sorted.map((s) => ({
        day_of_week: s.day_of_week,
        period_number: s.period_number,
        start_time: s.start_time,
        end_time: s.end_time,
        subject: s.subject,
        classLabel: `${s.timetables.grade}${s.timetables.stream ? ` ${s.timetables.stream}` : ""}`,
        room: s.room,
      })),
      filename: `my-timetable-${academicYear}-term${selectedTerm}.pdf`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Select value={selectedTerm} onValueChange={setSelectedTerm}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Term 1</SelectItem>
            <SelectItem value="2">Term 2</SelectItem>
            <SelectItem value="3">Term 3</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadPdf} disabled={!slots?.length}>
            <Download className="w-4 h-4 mr-2" /> PDF
          </Button>
          <Button variant="outline" onClick={handleDownloadCsv} disabled={!slots?.length}>
            <FileDown className="w-4 h-4 mr-2" /> CSV
          </Button>
        </div>
      </div>

      {!slots || slots.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No timetable entries found for this term.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {DAYS.map(day => {
            const daySlots = slotsByDay[day] || [];
            if (daySlots.length === 0) return null;
            
            return (
              <Card key={day}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {getDayName(day)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Room</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {daySlots.sort((a, b) => a.period_number - b.period_number).map((slot, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">
                            Period {slot.period_number}
                            {slot.start_time && slot.end_time ? (
                              <span className="text-muted-foreground"> • {slot.start_time}–{slot.end_time}</span>
                            ) : null}
                          </TableCell>
                          <TableCell>{slot.subject}</TableCell>
                          <TableCell>
                            {slot.timetables.grade}{slot.timetables.stream ? ` ${slot.timetables.stream}` : ''}
                          </TableCell>
                          <TableCell>{slot.room || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Timetable() {
  const { user } = useAuth();
  const { data: academicYearData } = useAcademicYear();
  const academicYear = academicYearData?.label || "2025";
  const [selectedTerm, setSelectedTerm] = useState("1");
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("all");

  const { data: classes = [] } = useClasses();
  const { data: teachers = [] } = useTeachers();
  const { data: timetables = [], isLoading, refetch } = useTimetables({
    academic_year: academicYear,
    term: selectedTerm && selectedTerm !== "all" ? parseInt(selectedTerm) : undefined,
  });

  const isAdmin = user?.role === "admin";

  // Filter timetables by selected class
  const filteredTimetables = useMemo(() => {
    if (selectedClassId === "all") return timetables;
    const selectedClass = classes.find(c => c.id === selectedClassId);
    if (!selectedClass) return timetables;
    return timetables.filter(t => t.grade === selectedClass.grade && t.stream === selectedClass.stream);
  }, [timetables, selectedClassId, classes]);

  // Get unique class options for filter
  const classOptions = useMemo(() => {
    return classes.map(cls => ({
      id: cls.id,
      label: `${cls.grade} - ${cls.stream}`
    }));
  }, [classes]);

  const allSlotsForSchool = useMemo(() => {
    const slots = timetables.flatMap((t) => (t.timetable_slots || []).map((s) => ({ timetable: t, slot: s })));
    return slots;
  }, [timetables]);

  const teacherSchedule = useMemo(() => {
    if (selectedTeacherId === "all") return [];
    return allSlotsForSchool
      .filter(({ slot }) => slot.teacher_id === selectedTeacherId)
      .map(({ timetable, slot }) => ({
        ...slot,
        timetables: {
          grade: timetable.grade,
          stream: timetable.stream || "",
          academic_year: timetable.academic_year,
          term: timetable.term,
        },
      }))
      .sort((a, b) => {
        if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
        return a.period_number - b.period_number;
      });
  }, [allSlotsForSchool, selectedTeacherId]);

  if (isAdmin) {
    // Admin view - create and manage timetables
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Timetable Management</h1>
              <p className="text-muted-foreground">Create and manage class timetables</p>
            </div>
            <CreateTimetableDialog onSuccess={() => refetch()} />
          </div>

          <Tabs defaultValue="classes" className="space-y-4">
            <TabsList>
              <TabsTrigger value="classes">Classes</TabsTrigger>
              <TabsTrigger value="teachers">Teachers</TabsTrigger>
            </TabsList>

            <TabsContent value="classes" className="space-y-4">
              <div className="flex gap-4">
                <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Terms</SelectItem>
                    <SelectItem value="1">Term 1</SelectItem>
                    <SelectItem value="2">Term 2</SelectItem>
                    <SelectItem value="3">Term 3</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : filteredTimetables.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No timetables found. Create a new timetable to get started.
                  </CardContent>
                </Card>
              ) : (
                <div>
                  {filteredTimetables.map((timetable) => (
                    <TimetableView key={timetable.id} timetable={timetable} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="teachers" className="space-y-4">
              <div className="flex gap-4 items-center">
                <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Terms</SelectItem>
                    <SelectItem value="1">Term 1</SelectItem>
                    <SelectItem value="2">Term 2</SelectItem>
                    <SelectItem value="3">Term 3</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                  <SelectTrigger className="w-[240px]">
                    <SelectValue placeholder="Select teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Select a teacher</SelectItem>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  disabled={selectedTeacherId === "all" || teacherSchedule.length === 0}
                  onClick={() => {
                    if (selectedTeacherId === "all") return;
                    const teacherName = teachers.find((t) => t.id === selectedTeacherId)?.full_name || "Teacher";
                    const rows = [
                      ["Teacher", teacherName],
                      ["Academic Year", academicYear],
                      ["Term", selectedTerm === "all" ? "All" : selectedTerm],
                      [],
                      ["Day", "Period", "Subject", "Class", "Room"],
                      ...teacherSchedule.map((s) => [
                        getDayName(s.day_of_week),
                        String(s.period_number),
                        s.subject,
                        `${s.timetables.grade}${s.timetables.stream ? ` ${s.timetables.stream}` : ""}`,
                        s.room || "",
                      ]),
                    ];
                    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
                    downloadBlob(
                      `teacher-timetable-${teacherName.replaceAll(" ", "-")}-${academicYear}-term${selectedTerm}.csv`,
                      csv,
                      "text/csv;charset=utf-8"
                    );
                  }}
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  disabled={selectedTeacherId === "all" || teacherSchedule.length === 0}
                  onClick={async () => {
                    if (selectedTeacherId === "all") return;
                    const teacherName = teachers.find((t) => t.id === selectedTeacherId)?.full_name || "Teacher";

                    await downloadTeacherSchedulePdf({
                      teacherName,
                      academicYear,
                      termLabel: selectedTerm === "all" ? "All" : selectedTerm,
                      rows: teacherSchedule.map((s) => ({
                        day_of_week: s.day_of_week,
                        period_number: s.period_number,
                        start_time: s.start_time,
                        end_time: s.end_time,
                        subject: s.subject,
                        classLabel: `${s.timetables.grade}${s.timetables.stream ? ` ${s.timetables.stream}` : ""}`,
                        room: s.room,
                      })),
                      filename: `teacher-timetable-${teacherName.replaceAll(" ", "-")}-${academicYear}-term${selectedTerm}.pdf`,
                    });
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </Button>
              </div>

              {selectedTeacherId === "all" ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Select a teacher to view and download their timetable.
                  </CardContent>
                </Card>
              ) : teacherSchedule.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No timetable entries found for the selected teacher (with the current term filter).
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {DAYS.map((day) => {
                    const daySlots = teacherSchedule.filter((s) => s.day_of_week === day);
                    if (daySlots.length === 0) return null;
                    return (
                      <Card key={day}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {getDayName(day)}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Period</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead>Class</TableHead>
                                <TableHead>Room</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {daySlots.map((slot, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-medium">Period {slot.period_number}</TableCell>
                                  <TableCell>{slot.subject}</TableCell>
                                  <TableCell>
                                    {slot.timetables.grade}
                                    {slot.timetables.stream ? ` ${slot.timetables.stream}` : ""}
                                  </TableCell>
                                  <TableCell>{slot.room || "-"}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    );
  }

  // Teacher view - see own timetable
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Timetable</h1>
          <p className="text-muted-foreground">View your teaching schedule</p>
        </div>
        <TeacherTimetableView />
      </div>
    </DashboardLayout>
  );
}