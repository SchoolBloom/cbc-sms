import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Timetable {
  id: string;
  grade: string;
  stream: string | null;
  academic_year: string;
  term: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  timetable_slots?: TimetableSlot[];
}

export interface TimetableSlot {
  id: string;
  timetable_id: string;
  day_of_week: number;
  period_number: number;
  subject: string;
  teacher_id: string | null;
  room: string | null;
  start_time?: string | null;
  end_time?: string | null;
  slot_type?: "lesson" | "break";
  label?: string | null;
  teachers?: {
    full_name: string;
  };
}

export interface TeacherTimetableSlot {
  id: string;
  day_of_week: number;
  period_number: number;
  subject: string;
  room: string | null;
  start_time?: string | null;
  end_time?: string | null;
  timetable_id: string;
  timetables: {
    grade: string;
    stream: string;
    academic_year: string;
    term: number;
  };
}

export interface TimetableSlotInput {
  day_of_week: number;
  period_number: number;
  subject?: string;
  teacher_id?: string;
  room?: string;
  start_time?: string;
  end_time?: string;
  slot_type?: "lesson" | "break";
  label?: string;
}

export interface CreateTimetableInput {
  grade: string;
  stream?: string;
  academic_year: string;
  term?: number;
  slots?: TimetableSlotInput[];
}

// Fetch all timetables
export function useTimetables(filters?: {
  academic_year?: string;
  term?: number;
  grade?: string;
}) {
  return useQuery({
    queryKey: ["timetables", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.academic_year) params.append("academic_year", filters.academic_year);
      if (filters?.term) params.append("term", filters.term.toString());
      if (filters?.grade) params.append("grade", filters.grade);

      const response = await fetch(`/api/timetables?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Fetch timetables error:", result);
        throw new Error(result.error || "Failed to fetch timetables");
      }

      return result.timetables as Timetable[];
    },
    retry: false,
  });
}

// Fetch teacher's personal timetable
export function useTeacherTimetable(filters?: {
  academic_year?: string;
  term?: number;
}) {
  return useQuery({
    queryKey: ["teacher-timetable", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.academic_year) params.append("academic_year", filters.academic_year);
      if (filters?.term) params.append("term", filters.term.toString());

      const response = await fetch(`/api/timetables/teacher?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Fetch teacher timetable error:", result);
        throw new Error(result.error || "Failed to fetch teacher timetable");
      }

      return result.slots as TeacherTimetableSlot[];
    },
    retry: false,
  });
}

// Create a new timetable
export function useCreateTimetable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTimetableInput) => {
      const response = await fetch("/api/timetables", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("API Error:", result);
        throw new Error(result.error || "Failed to create timetable");
      }

      return result;
    },
    onSuccess: () => {
      toast.success("Timetable created successfully");
      queryClient.invalidateQueries({ queryKey: ["timetables"] });
    },
    onError: (error: Error) => {
      console.error("Mutation Error:", error);
      toast.error(error.message);
    },
  });
}

// Update timetable slots
export function useUpdateTimetableSlots() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ timetableId, slots }: { timetableId: string; slots: TimetableSlotInput[] }) => {
      const response = await fetch(`/api/timetables/${timetableId}/slots`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ slots }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Update slots error:", result);
        throw new Error(result.error || "Failed to update timetable slots");
      }

      return result;
    },
    onSuccess: () => {
      toast.success("Timetable updated successfully");
      queryClient.invalidateQueries({ queryKey: ["timetables"] });
    },
    onError: (error: Error) => {
      console.error("Update mutation error:", error);
      toast.error(error.message);
    },
  });
}

// Delete a timetable
export function useDeleteTimetable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (timetableId: string) => {
      const response = await fetch(`/api/timetables/${timetableId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Delete timetable error:", result);
        throw new Error(result.error || "Failed to delete timetable");
      }

      return result;
    },
    onSuccess: () => {
      toast.success("Timetable deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["timetables"] });
    },
    onError: (error: Error) => {
      console.error("Delete mutation error:", error);
      toast.error(error.message);
    },
  });
}

// Helper function to get day name
export function getDayName(dayOfWeek: number): string {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  return days[dayOfWeek - 1] || "";
}

// Helper function to format timetable for display
export function formatTimetableByDay(slots: TimetableSlot[]): Record<number, TimetableSlot[]> {
  return slots.reduce((acc, slot) => {
    if (!acc[slot.day_of_week]) {
      acc[slot.day_of_week] = [];
    }
    acc[slot.day_of_week].push(slot);
    return acc;
  }, {} as Record<number, TimetableSlot[]>);
}

// Helper function to format teacher timetable for display
export function formatTeacherTimetableByDay(slots: TeacherTimetableSlot[]): Record<number, TeacherTimetableSlot[]> {
  return slots.reduce((acc, slot) => {
    if (!acc[slot.day_of_week]) {
      acc[slot.day_of_week] = [];
    }
    acc[slot.day_of_week].push(slot);
    return acc;
  }, {} as Record<number, TeacherTimetableSlot[]>);
}