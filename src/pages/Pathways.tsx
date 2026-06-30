import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, Lock, Unlock, Save, FileText, CheckCircle, 
  AlertCircle, Route, ChevronRight, GraduationCap, 
  User, Users, Calendar, Info, Loader2 
} from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { useLearners } from "@/hooks/useLearners";
import { useAcademicYear } from "@/hooks/useAcademicYear";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { getSubjectsForPathway } from "@/lib/pathwaySubjects";
import { 
  usePathwayPreferences, 
  usePathwayAllocation, 
  useSavePathwayPreferences, 
  useSavePathwayAllocation,
  useSetPathwayPreferencesLock
} from "@/hooks/usePathways";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PATHWAY_OPTIONS = [
  { value: "STEM", label: "Science, Tech, Engineering & Math (STEM)", description: "Focuses on sciences, mathematics, technology, and engineering disciplines." },
  { value: "Social_Sciences", label: "Social Sciences & Humanities", description: "Focuses on languages, literature, history, geography, and social studies." },
  { value: "Arts_Sports", label: "Arts & Sports Science", description: "Focuses on creative arts, performing arts, sports science, and physical education." }
];

const ALLOCATION_SOURCES = [
  { value: "KJSEA", label: "KJSEA Placement Results" },
  { value: "manual", label: "Manual Administrator Assignment" },
  { value: "appeal", label: "Parental Appeal/Special Case" }
];

export default function Pathways() {
  const { user, selectedChildId, setSelectedChildId } = useRole();
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();

  // Selected learner state (admin only)
  const [selectedLearnerId, setSelectedLearnerId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Form states
  const [pref1, setPref1] = useState<string>("");
  const [pref2, setPref2] = useState<string>("");
  const [pref3, setPref3] = useState<string>("");
  const [pref4, setPref4] = useState<string>("");
  const [school1, setSchool1] = useState<string>("");
  const [school2, setSchool2] = useState<string>("");
  const [school3, setSchool3] = useState<string>("");
  const [school4, setSchool4] = useState<string>("");
  const [allocatedPathway, setAllocatedPathway] = useState<string>("");
  const [allocatedSchoolName, setAllocatedSchoolName] = useState<string>("");
  const [allocatedSchoolCode, setAllocatedSchoolCode] = useState<string>("");
  const [kjseaScore, setKjseaScore] = useState<string>("");
  const [allocationSource, setAllocationSource] = useState<string>("KJSEA");
  const [notes, setNotes] = useState<string>("");

  // Academic year and base queries
  const { data: academicYear } = useAcademicYear();
  const currentAcademicYear = academicYear?.label || new Date().getFullYear().toString();

  const { data: learners = [], isLoading: loadingLearners } = useLearners();
  const { supportsPrimaryJunior, supportsSenior } = useSchoolScope();

  // Filter JSS (Grade 9) and SSS (Grade 10-12) learners based on school capability
  const grade9Learners = useMemo(() => {
    return learners.filter((l) => {
      const grade = l.classes?.grade || l.grade || "";
      const isGrade9 = grade === "Grade 9";
      const isSSS = ["Grade 10", "Grade 11", "Grade 12"].includes(grade);
      return (isGrade9 && supportsPrimaryJunior) || (isSSS && supportsSenior);
    });
  }, [learners, supportsPrimaryJunior, supportsSenior]);

  // If parent, select their linked child as active learner
  const activeLearnerId = isAdmin ? selectedLearnerId : (selectedChildId || "");

  const activeLearner = useMemo(() => {
    if (isAdmin) {
      return grade9Learners.find((l) => l.id === selectedLearnerId);
    } else {
      return user?.children?.find((c) => c.id === selectedChildId);
    }
  }, [isAdmin, selectedLearnerId, grade9Learners, user?.children, selectedChildId]) as any;

  const isLearnerSSS = useMemo(() => {
    if (!activeLearner) return false;
    const grade = activeLearner.classes?.grade || activeLearner.grade || "";
    return ["Grade 10", "Grade 11", "Grade 12"].includes(grade);
  }, [activeLearner]);

  // Query preferences & allocation for the active learner
  const { data: preferences = [], isLoading: loadingPref } = usePathwayPreferences(activeLearnerId);
  const { data: allocation = null, isLoading: loadingAlloc } = usePathwayAllocation(activeLearnerId);

  // Queries for list view badges/status in admin panel
  const { data: allAllocations = [] } = useQuery({
    queryKey: ["all-pathway-allocations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pathway_allocations")
        .select("*");
      if (error) throw error;
      return data;
    },
    enabled: isAdmin
  });

  const { data: allPreferences = [] } = useQuery({
    queryKey: ["all-pathway-preferences"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pathway_preferences")
        .select("*");
      if (error) throw error;
      return data;
    },
    enabled: isAdmin
  });

  // Mutations
  const savePreferencesMutation = useSavePathwayPreferences();
  const saveAllocationMutation = useSavePathwayAllocation();
  const lockMutation = useSetPathwayPreferencesLock();

  const isPreferencesLocked = useMemo(() => {
    return preferences && preferences.length > 0 && preferences.some((p) => p.is_locked);
  }, [preferences]);

  const [isLockedState, setIsLockedState] = useState(false);

  useEffect(() => {
    setIsLockedState(isPreferencesLocked);
  }, [isPreferencesLocked]);

  const handleToggleLock = (checked: boolean) => {
    if (!activeLearnerId) return;
    lockMutation.mutate({
      learnerId: activeLearnerId,
      academicYear: currentAcademicYear,
      isLocked: checked,
    });
  };

  // Sync forms with database values
  useEffect(() => {
    if (preferences && preferences.length > 0) {
      const p1 = preferences.find(p => p.rank === 1);
      const p2 = preferences.find(p => p.rank === 2);
      const p3 = preferences.find(p => p.rank === 3);
      const p4 = preferences.find(p => p.rank === 4);
      setPref1(p1?.pathway || "");
      setSchool1(p1?.preferred_school_name || "");
      setPref2(p2?.pathway || "");
      setSchool2(p2?.preferred_school_name || "");
      setPref3(p3?.pathway || "");
      setSchool3(p3?.preferred_school_name || "");
      setPref4(p4?.pathway || "");
      setSchool4(p4?.preferred_school_name || "");
    } else {
      setPref1("");
      setSchool1("");
      setPref2("");
      setSchool2("");
      setPref3("");
      setSchool3("");
      setPref4("");
      setSchool4("");
    }
  }, [preferences]);

  useEffect(() => {
    if (allocation) {
      setAllocatedPathway(allocation.pathway || "");
      setAllocatedSchoolName(allocation.allocated_school_name || "");
      setAllocatedSchoolCode(allocation.allocated_school_code || "");
      setKjseaScore(allocation.kjsea_score !== null ? allocation.kjsea_score.toString() : "");
      setAllocationSource(allocation.allocation_source || "KJSEA");
      setNotes(allocation.notes || "");
    } else {
      setAllocatedPathway("");
      setAllocatedSchoolName("");
      setAllocatedSchoolCode("");
      setKjseaScore("");
      setAllocationSource("KJSEA");
      setNotes("");
    }
  }, [allocation]);

  // Auto-select first learner for admin if list is loaded and none selected
  useEffect(() => {
    if (isAdmin && grade9Learners.length > 0 && !selectedLearnerId) {
      setSelectedLearnerId(grade9Learners[0].id);
    }
  }, [isAdmin, grade9Learners, selectedLearnerId]);

  // Handle saving preferences
  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLearnerId) return;

    if (!pref1 || !pref2 || !pref3 || !pref4) {
      toast.error("Please select all four preferences");
      return;
    }

    if (!school1.trim() || !school2.trim() || !school3.trim() || !school4.trim()) {
      toast.error("Please enter preferred schools for all four choices");
      return;
    }

    const preferencesList: { rank: number; pathway: 'STEM' | 'Social_Sciences' | 'Arts_Sports'; preferred_school_name: string }[] = [
      { rank: 1, pathway: pref1 as 'STEM' | 'Social_Sciences' | 'Arts_Sports', preferred_school_name: school1.trim() },
      { rank: 2, pathway: pref2 as 'STEM' | 'Social_Sciences' | 'Arts_Sports', preferred_school_name: school2.trim() },
      { rank: 3, pathway: pref3 as 'STEM' | 'Social_Sciences' | 'Arts_Sports', preferred_school_name: school3.trim() },
      { rank: 4, pathway: pref4 as 'STEM' | 'Social_Sciences' | 'Arts_Sports', preferred_school_name: school4.trim() }
    ];

    savePreferencesMutation.mutate({
      learnerId: activeLearnerId,
      academicYear: currentAcademicYear,
      preferences: preferencesList
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["all-pathway-preferences"] });
      }
    });
  };

  // Handle saving allocation
  const handleSaveAllocation = (finalized: boolean) => {
    if (!activeLearnerId) return;

    if (!allocatedPathway) {
      toast.error("Please select a pathway for allocation");
      return;
    }

    const scoreNum = kjseaScore ? parseFloat(kjseaScore) : null;
    if (scoreNum !== null && (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100)) {
      toast.error("KJSEA Score must be a valid number between 0 and 100");
      return;
    }

    saveAllocationMutation.mutate({
      learnerId: activeLearnerId,
      academicYear: currentAcademicYear,
      pathway: allocatedPathway as 'STEM' | 'Social_Sciences' | 'Arts_Sports',
      kjseaScore: scoreNum,
      allocationSource: allocationSource as 'KJSEA' | 'manual' | 'appeal',
      notes: notes || null,
      finalized,
      userId: user?.id || "",
      allocatedSchoolName: allocatedSchoolName.trim() || null,
      allocatedSchoolCode: allocatedSchoolCode.trim() || null,
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["all-pathway-allocations"] });
      }
    });
  };

  // Filtered Grade 9 list for searching
  const filteredGrade9Learners = useMemo(() => {
    return grade9Learners.filter((l) => {
      const q = searchQuery.toLowerCase();
      return (
        l.full_name.toLowerCase().includes(q) ||
        l.admission_number.toLowerCase().includes(q)
      );
    });
  }, [grade9Learners, searchQuery]);

  // Helper: check learner's status
  const getLearnerStatusInfo = (learnerId: string) => {
    const alloc = allAllocations.find(a => a.learner_id === learnerId);
    if (!alloc) return { label: "No placement", color: "bg-muted text-muted-foreground border-muted" };
    if (alloc.finalized) {
      return { 
        label: `Finalized (${alloc.pathway})`, 
        color: "bg-success/15 text-success border-success/35 font-medium" 
      };
    }
    return { 
      label: `Draft (${alloc.pathway})`, 
      color: "bg-warning/15 text-warning border-warning/35 font-medium" 
    };
  };

  return (
    <DashboardLayout>
      <div className="page-header mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="page-title font-display flex items-center gap-2">
              <Route className="w-8 h-8 text-primary" />
              Senior Secondary Pathway Selection
            </h1>
            <p className="page-subtitle">
              Record and finalize Grade 9 competency pathways transitioning to Senior Secondary Education (STEM, Social Sciences, Arts & Sports)
            </p>
          </div>
          {!isAdmin && user?.children && user.children.length > 1 && (
            <Select
              value={selectedChildId || ""}
              onValueChange={(val) => setSelectedChildId(val)}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Select child" />
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

      {isAdmin ? (
        // ================= ADMINISTRATOR VIEW =================
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Pathway Learners List */}
          <Card className="lg:col-span-4 h-[calc(100vh-14rem)] flex flex-col overflow-hidden">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-base flex items-center justify-between">
                <span>
                  {supportsPrimaryJunior && supportsSenior 
                    ? "JSS & SSS Students" 
                    : supportsSenior 
                    ? "Senior Secondary Students" 
                    : "Grade 9 JSS Students"}
                </span>
                <Badge variant="outline">{grade9Learners.length} Registered</Badge>
              </CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search student or adm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              {loadingLearners ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : filteredGrade9Learners.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  No students found matching categories.
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="divide-y divide-border">
                    {filteredGrade9Learners.map((learner) => {
                      const isSelected = learner.id === selectedLearnerId;
                      const status = getLearnerStatusInfo(learner.id);
                      return (
                        <button
                          key={learner.id}
                          onClick={() => setSelectedLearnerId(learner.id)}
                          className={cn(
                            "w-full text-left p-3.5 transition-colors flex items-center justify-between hover:bg-muted/40",
                            isSelected && "bg-muted border-l-4 border-primary pl-[10px]"
                          )}
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="text-sm font-medium text-foreground truncate">
                              {learner.full_name}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono">{learner.admission_number}</span>
                              <span>•</span>
                              <span>{learner.classes?.grade || learner.grade || "Grade 9"}</span>
                              <span>•</span>
                              <span>{learner.classes?.stream || "No stream"}</span>
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", status.color)}>
                              {status.label}
                            </Badge>
                            <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Right Column: Form Panel */}
          <div className="lg:col-span-8 space-y-6">
            {!selectedLearnerId ? (
              <Card className="h-full flex items-center justify-center border-dashed py-24">
                <CardContent className="text-center">
                  <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                   <h3 className="font-semibold text-lg">No Student Selected</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mt-1">
                    Select a student from the sidebar to record pathway preferences, placements, and secondary school assignments.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Active Student Header Info */}
                {activeLearner && (
                  <div className="flex items-center gap-4 bg-muted/40 border p-4 rounded-xl">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground">{activeLearner.full_name}</h2>
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span>Admission No: <strong className="font-mono">{activeLearner.admission_number}</strong></span>
                        <span>•</span>
                        <span>Stream: {activeLearner.classes?.stream || "N/A"}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Year {currentAcademicYear}
                        </span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Main Cards: Preferences & Allocation */}
                <div className={cn("grid grid-cols-1 gap-6", !isLearnerSSS && "md:grid-cols-2")}>
                  {/* Preferences Card */}
                  {!isLearnerSSS && (
                    <Card>
                      <form onSubmit={handleSavePreferences}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Route className="w-5 h-5 text-primary" />
                            Ranked Preferences
                          </CardTitle>
                          {isAdmin && preferences.length > 0 && !allocation?.finalized && (
                            <div className="flex items-center gap-2 border bg-muted/40 px-2 py-1.5 rounded-lg">
                              <Switch
                                id="lock-preferences"
                                checked={isLockedState}
                                onCheckedChange={handleToggleLock}
                                disabled={lockMutation.isPending}
                              />
                              <Label htmlFor="lock-preferences" className="text-xs flex items-center gap-1 cursor-pointer font-medium">
                                {isLockedState ? (
                                  <>
                                    <Lock className="w-3 h-3 text-warning" /> Locked
                                  </>
                                ) : (
                                  <>
                                    <Unlock className="w-3 h-3 text-muted-foreground" /> Lock
                                  </>
                                )}
                              </Label>
                            </div>
                          )}
                        </div>
                        <CardDescription>
                          Record the student's top four ranked pathway choices and preferred senior secondary schools.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Choice 1 */}
                        <div className="p-3 border rounded-lg bg-muted/20 space-y-3">
                          <label className="text-xs font-bold text-foreground">1st Choice Preference</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] text-muted-foreground uppercase font-semibold">Pathway</label>
                              <Select
                                value={pref1}
                                onValueChange={setPref1}
                                disabled={allocation?.finalized || isPreferencesLocked || savePreferencesMutation.isPending}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Pathway" />
                                </SelectTrigger>
                                <SelectContent>
                                  {PATHWAY_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {opt.value === "STEM" ? "STEM" : opt.value === "Social_Sciences" ? "Social Sciences" : "Arts & Sports"}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-muted-foreground uppercase font-semibold">Senior Secondary School</label>
                              <Input
                                placeholder="e.g. Alliance High School"
                                value={school1}
                                onChange={(e) => setSchool1(e.target.value)}
                                disabled={allocation?.finalized || isPreferencesLocked || savePreferencesMutation.isPending}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Choice 2 */}
                        <div className="p-3 border rounded-lg bg-muted/20 space-y-3">
                          <label className="text-xs font-bold text-foreground">2nd Choice Preference</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] text-muted-foreground uppercase font-semibold">Pathway</label>
                              <Select
                                value={pref2}
                                onValueChange={setPref2}
                                disabled={allocation?.finalized || isPreferencesLocked || savePreferencesMutation.isPending}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Pathway" />
                                </SelectTrigger>
                                <SelectContent>
                                  {PATHWAY_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {opt.value === "STEM" ? "STEM" : opt.value === "Social_Sciences" ? "Social Sciences" : "Arts & Sports"}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-muted-foreground uppercase font-semibold">Senior Secondary School</label>
                              <Input
                                placeholder="e.g. Mang'u High School"
                                value={school2}
                                onChange={(e) => setSchool2(e.target.value)}
                                disabled={allocation?.finalized || isPreferencesLocked || savePreferencesMutation.isPending}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Choice 3 */}
                        <div className="p-3 border rounded-lg bg-muted/20 space-y-3">
                          <label className="text-xs font-bold text-foreground">3rd Choice Preference</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] text-muted-foreground uppercase font-semibold">Pathway</label>
                              <Select
                                value={pref3}
                                onValueChange={setPref3}
                                disabled={allocation?.finalized || isPreferencesLocked || savePreferencesMutation.isPending}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Pathway" />
                                </SelectTrigger>
                                <SelectContent>
                                  {PATHWAY_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {opt.value === "STEM" ? "STEM" : opt.value === "Social_Sciences" ? "Social Sciences" : "Arts & Sports"}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-muted-foreground uppercase font-semibold">Senior Secondary School</label>
                              <Input
                                placeholder="e.g. Kenya High School"
                                value={school3}
                                onChange={(e) => setSchool3(e.target.value)}
                                disabled={allocation?.finalized || isPreferencesLocked || savePreferencesMutation.isPending}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Choice 4 */}
                        <div className="p-3 border rounded-lg bg-muted/20 space-y-3">
                          <label className="text-xs font-bold text-foreground">4th Choice Preference</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] text-muted-foreground uppercase font-semibold">Pathway</label>
                              <Select
                                value={pref4}
                                onValueChange={setPref4}
                                disabled={allocation?.finalized || isPreferencesLocked || savePreferencesMutation.isPending}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Pathway" />
                                </SelectTrigger>
                                <SelectContent>
                                  {PATHWAY_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {opt.value === "STEM" ? "STEM" : opt.value === "Social_Sciences" ? "Social Sciences" : "Arts & Sports"}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-muted-foreground uppercase font-semibold">Senior Secondary School</label>
                              <Input
                                placeholder="e.g. Lenana School"
                                value={school4}
                                onChange={(e) => setSchool4(e.target.value)}
                                disabled={allocation?.finalized || isPreferencesLocked || savePreferencesMutation.isPending}
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        {allocation?.finalized ? (
                          <div className="w-full flex items-center justify-center py-2 bg-muted text-muted-foreground rounded text-xs gap-1.5">
                            <Lock className="w-3.5 h-3.5" />
                            Preferences locked after finalization
                          </div>
                        ) : isPreferencesLocked ? (
                          <div className="w-full flex items-center justify-center py-2.5 bg-warning/10 text-warning border border-warning/20 rounded-lg text-xs gap-1.5 font-semibold">
                            <Lock className="w-3.5 h-3.5" />
                            Preferences Locked
                          </div>
                        ) : (
                          <Button 
                            type="submit" 
                            className="w-full gap-2" 
                            disabled={savePreferencesMutation.isPending}
                          >
                            {savePreferencesMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            Save Preferences
                          </Button>
                        )}
                      </CardFooter>
                    </form>
                  </Card>
                )}

                {/* Parents Confirmed Placement View */}
                <Card className={cn(allocation?.finalized && "border-success/45 bg-success/5 shadow-sm", isLearnerSSS && "col-span-full")}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-primary" />
                        {isLearnerSSS ? "Active Pathway Assignment" : "Placement Allocation Results"}
                      </span>
                      {(allocation?.finalized || isLearnerSSS) ? (
                        <Badge variant="outline" className="bg-success/20 text-success border-success/30 font-semibold gap-1 py-0.5">
                          <CheckCircle className="w-3.5 h-3.5" /> {isLearnerSSS ? "Active & Enrolled" : "Finalized"}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-warning/20 text-warning border-warning/30 font-semibold py-0.5">
                          Pending Placement
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {isLearnerSSS 
                        ? "Confirm active student pathway, KJSEA score, and save/finalize record." 
                        : "Confirm placement pathway, KJSEA scores, and save/finalize record."}
                    </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground">Confirmed SSS Pathway</label>
                        <Select
                          value={allocatedPathway}
                          onValueChange={setAllocatedPathway}
                          disabled={allocation?.finalized || saveAllocationMutation.isPending}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select confirmed pathway" />
                          </SelectTrigger>
                          <SelectContent>
                            {PATHWAY_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.value === "STEM" ? "STEM" : opt.value === "Social_Sciences" ? "Social Sciences" : "Arts & Sports"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground">Allocated Senior Secondary School</label>
                        <Input
                          placeholder="e.g. Alliance High School"
                          value={allocatedSchoolName}
                          onChange={(e) => setAllocatedSchoolName(e.target.value)}
                          disabled={allocation?.finalized || saveAllocationMutation.isPending}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground">School Code</label>
                        <Input
                          placeholder="e.g. 12345678"
                          value={allocatedSchoolCode}
                          onChange={(e) => setAllocatedSchoolCode(e.target.value)}
                          disabled={allocation?.finalized || saveAllocationMutation.isPending}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground">KJSEA Score (%)</label>
                        <Input
                          type="number"
                          placeholder="e.g. 78"
                          value={kjseaScore}
                          onChange={(e) => setKjseaScore(e.target.value)}
                          disabled={allocation?.finalized || saveAllocationMutation.isPending}
                          min={0}
                          max={100}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground">Allocation Source</label>
                        <Select
                          value={allocationSource}
                          onValueChange={setAllocationSource}
                          disabled={allocation?.finalized || saveAllocationMutation.isPending}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select allocation source" />
                          </SelectTrigger>
                          <SelectContent>
                            {ALLOCATION_SOURCES.map((src) => (
                              <SelectItem key={src.value} value={src.value}>
                                {src.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground">Placement Notes / Appeals</label>
                        <Textarea
                          placeholder="Record details regarding student's allocation, KJSEA evaluation, parent request or administrative override reasons..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          disabled={allocation?.finalized || saveAllocationMutation.isPending}
                          className="h-16 resize-none"
                        />
                      </div>

                      {isLearnerSSS && allocatedPathway && (
                        <div className="mt-6 pt-6 border-t border-border space-y-3">
                          <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                            <Info className="w-4 h-4 text-primary" />
                            Enrolled Pathway Subjects
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Subjects associated with the student's active {allocatedPathway === "STEM" ? "STEM" : allocatedPathway === "Social_Sciences" ? "Social Sciences" : "Arts & Sports"} Pathway:
                          </p>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {getSubjectsForPathway(allocatedPathway).map((sub) => (
                              <Badge key={sub} variant="secondary" className="text-xs py-1 px-2.5 bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20">
                                {sub}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2">
                      {!allocation?.finalized ? (
                        <>
                          <div className="flex gap-2 w-full">
                            <Button
                              variant="outline"
                              onClick={() => handleSaveAllocation(false)}
                              disabled={saveAllocationMutation.isPending}
                              className="flex-1 gap-1.5"
                            >
                              {saveAllocationMutation.isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Save className="w-3.5 h-3.5" />
                              )}
                              Save Draft
                            </Button>
                            <Button
                              variant="default"
                              onClick={() => handleSaveAllocation(true)}
                              disabled={saveAllocationMutation.isPending}
                              className="flex-1 gap-1.5 bg-success hover:bg-success/90 text-success-foreground"
                            >
                              {saveAllocationMutation.isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Lock className="w-3.5 h-3.5" />
                              )}
                              Finalize Placement
                            </Button>
                          </div>
                          <p className="text-[10px] text-muted-foreground text-center mt-1">
                            Warning: Finalizing locks this allocation and updates the learner's official profile.
                          </p>
                        </>
                      ) : (
                        <div className="w-full space-y-2">
                          <Alert variant="default" className="bg-success/10 text-success border-success/20 py-2.5">
                            <CheckCircle className="w-4 h-4 text-success" />
                            <AlertTitle className="text-xs font-bold">Lock Enabled</AlertTitle>
                            <AlertDescription className="text-[11px] leading-tight">
                              This placement is finalized. To override, submit an administrative appeal request.
                            </AlertDescription>
                          </Alert>
                          {allocation.finalized_at && (
                            <p className="text-[10px] text-muted-foreground text-center">
                              Finalized on: {new Date(allocation.finalized_at).toLocaleDateString()} at {new Date(allocation.finalized_at).toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                      )}
                    </CardFooter>
                  </Card>
                </div>

                {/* Educational Pathways Information Box */}
                <Card>
                  <CardHeader className="py-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Info className="w-4.5 h-4.5 text-primary" />
                      About CBC SSS Pathways
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4">
                    {PATHWAY_OPTIONS.map((opt) => (
                      <div key={opt.value} className="p-3 border rounded-lg bg-card text-xs">
                        <h4 className="font-bold text-foreground mb-1">
                          {opt.value === "STEM" ? "STEM" : opt.value === "Social_Sciences" ? "Social Sciences" : "Arts & Sports"}
                        </h4>
                        <p className="text-muted-foreground leading-relaxed">{opt.description}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      ) : (
        // ================= PARENT/GUARDIAN VIEW =================
        <div className="space-y-6">
          {!selectedChildId ? (
            <Card className="border-dashed py-16 text-center">
              <CardContent>
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg">No Linked Children Found</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                  We could not find any children registered under your parent account. Please contact the school administrator.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {activeLearner && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/40 border p-5 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center font-bold text-lg text-primary">
                      {activeLearner.full_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">{activeLearner.full_name}</h2>
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span>Admission No: <strong className="font-mono">{activeLearner.admission_number}</strong></span>
                        <span>•</span>
                        <span>Grade: {activeLearner.classes?.grade || "Grade 9"}</span>
                        <span>•</span>
                        <span>Stream: {activeLearner.classes?.stream || "N/A"}</span>
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-primary hover:bg-primary text-primary-foreground font-semibold py-1 px-3">
                    Academic Year {currentAcademicYear}
                  </Badge>
                </div>
              )}

              <div className={cn("grid grid-cols-1 gap-6", !isLearnerSSS && "md:grid-cols-2")}>
                {/* Parents Pathway Preferences view */}
                {!isLearnerSSS && (
                  <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Route className="w-5 h-5 text-primary" />
                      Recorded Preferences
                    </CardTitle>
                    <CardDescription>
                      Ranked choices submitted for Senior Secondary placement.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {loadingPref ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </div>
                    ) : preferences.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground text-xs">
                        No preferences have been recorded by the school administrator yet.
                      </div>
                    ) : (
                      <div className="space-y-3.5">
                        {[1, 2, 3, 4].map((rank) => {
                          const pref = preferences.find(p => p.rank === rank);
                          const pathwayLabel = pref 
                            ? (pref.pathway === "STEM" ? "STEM" : pref.pathway === "Social_Sciences" ? "Social Sciences" : "Arts & Sports") 
                            : "Not set";
                          return (
                            <div key={rank} className="p-3.5 border rounded-lg bg-card space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                                    {rank}
                                  </span>
                                  <span className="text-sm font-semibold text-muted-foreground">Choice Rank</span>
                                </div>
                                <Badge variant={pref ? "default" : "outline"} className="text-xs px-2.5 py-0.5">
                                  {pathwayLabel}
                                </Badge>
                              </div>
                              {pref?.preferred_school_name && (
                                <div className="text-xs text-muted-foreground pl-8">
                                  School: <strong className="text-foreground">{pref.preferred_school_name}</strong>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Parents Confirmed Placement View */}
              <Card className={cn(allocation?.finalized && "border-success/45 bg-success/5 shadow-sm", isLearnerSSS && "col-span-full")}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-primary" />
                      {isLearnerSSS ? "Active Pathway Assignment" : "Placement Allocation Results"}
                    </span>
                    {(allocation?.finalized || isLearnerSSS) ? (
                      <Badge variant="outline" className="bg-success/20 text-success border-success/30 font-semibold gap-1 py-0.5">
                        <CheckCircle className="w-3.5 h-3.5" /> {isLearnerSSS ? "Active & Enrolled" : "Finalized"}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-warning/20 text-warning border-warning/30 font-semibold py-0.5">
                        Pending Placement
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {isLearnerSSS 
                      ? "Official active pathway assignment and details for SSS education."
                      : "Official path assignment finalized by school administration."}
                  </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {loadingAlloc ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </div>
                    ) : (!allocation && (!isLearnerSSS || !activeLearner?.senior_pathway)) ? (
                      <div className="text-center py-8 text-muted-foreground text-xs leading-relaxed">
                        <AlertCircle className="w-7 h-7 mx-auto mb-2 text-muted-foreground/60" />
                        The placement evaluation process is currently ongoing.<br/>
                        Results will be published as soon as finalized.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-4 border rounded-xl bg-card">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">
                            Confirmed Pathway
                          </label>
                          <span className="text-lg font-extrabold text-foreground flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-success" />
                            {allocation 
                              ? (allocation.pathway === "STEM" ? "STEM" : allocation.pathway === "Social_Sciences" ? "Social Sciences" : "Arts & Sports")
                              : (activeLearner?.senior_pathway === "STEM" ? "STEM" : activeLearner?.senior_pathway === "Social_Sciences" ? "Social Sciences" : "Arts & Sports")
                            }
                          </span>
                        </div>

                        {((allocation && allocation.allocated_school_name) || (!allocation && activeLearner?.previous_school)) && (
                          <div className="p-4 border rounded-xl bg-card">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">
                              Allocated Senior Secondary School
                            </label>
                            <span className="text-lg font-bold text-foreground">
                              {allocation ? allocation.allocated_school_name : activeLearner?.previous_school}
                            </span>
                          </div>
                        )}

                        {allocation?.allocated_school_code && (
                          <div className="p-4 border rounded-xl bg-card">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">
                              School Code
                            </label>
                            <span className="text-lg font-mono font-bold text-foreground">
                              {allocation.allocated_school_code}
                            </span>
                          </div>
                        )}

                        {allocation?.kjsea_score !== null && allocation?.kjsea_score !== undefined && (
                          <div className="p-4 border rounded-xl bg-card">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">
                              KJSEA Average Score
                            </label>
                            <span className="text-lg font-mono font-bold text-foreground">
                              {allocation.kjsea_score}%
                            </span>
                          </div>
                        )}

                        {allocation?.notes && (
                          <div className="p-4 border rounded-xl bg-card">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">
                              Evaluation Remarks / Counseling Notes
                            </label>
                            <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">
                              {allocation.notes}
                            </p>
                          </div>
                        )}

                        {/* Active SSS subjects display */}
                        {((allocation && allocation.pathway) || (!allocation && activeLearner?.senior_pathway)) && (
                          <div className="mt-6 pt-6 border-t border-border space-y-3">
                            <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                              <Info className="w-4 h-4 text-primary" />
                              Active Enrolled Subjects
                            </h4>
                            <div className="flex flex-wrap gap-2 pt-1">
                              {getSubjectsForPathway(allocation ? allocation.pathway : activeLearner?.senior_pathway).map((sub) => (
                                <Badge key={sub} variant="secondary" className="text-xs py-1 px-2.5 bg-primary/5 text-primary border border-primary/20">
                                  {sub}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Pathway details for parental awareness */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Info className="w-5 h-5 text-primary" />
                    Overview of Senior Secondary Schools (SSS) Pathways
                  </CardTitle>
                  <CardDescription>
                    Under the CBC curriculum, learners choose specific channels based on talent, interest, and KJSEA assessment outcomes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="divide-y divide-border">
                  {PATHWAY_OPTIONS.map((opt) => (
                    <div key={opt.value} className="py-4 first:pt-0 last:pb-0">
                      <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        {opt.value === "STEM" ? "STEM Pathway" : opt.value === "Social_Sciences" ? "Social Sciences Pathway" : "Arts & Sports Science Pathway"}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-1.5 pl-4">
                        {opt.description}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
