import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Filter, Download, MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock data for students
const mockStudents = [
  { id: 1, admNo: "2024/001", name: "Grace Wanjiku Kamau", gender: "Female", grade: "Grade 4", stream: "4A", parent: "Mary Kamau", status: "active" },
  { id: 2, admNo: "2024/002", name: "Peter Ochieng Otieno", gender: "Male", grade: "Grade 6", stream: "6B", parent: "John Otieno", status: "active" },
  { id: 3, admNo: "2024/003", name: "Faith Njeri Mwangi", gender: "Female", grade: "Grade 3", stream: "3A", parent: "James Mwangi", status: "active" },
  { id: 4, admNo: "2024/004", name: "David Kipchoge Korir", gender: "Male", grade: "Grade 7", stream: "7A", parent: "Samuel Korir", status: "active" },
  { id: 5, admNo: "2024/005", name: "Sarah Akinyi Odhiambo", gender: "Female", grade: "PP2", stream: "PP2", parent: "Michael Odhiambo", status: "active" },
  { id: 6, admNo: "2023/089", name: "Brian Mutua Kioko", gender: "Male", grade: "Grade 8", stream: "8B", parent: "Patrick Kioko", status: "transferred" },
  { id: 7, admNo: "2024/006", name: "Joy Wambui Ngugi", gender: "Female", grade: "Grade 5", stream: "5A", parent: "Joseph Ngugi", status: "active" },
  { id: 8, admNo: "2024/007", name: "Kevin Onyango Juma", gender: "Male", grade: "Grade 2", stream: "2B", parent: "Daniel Juma", status: "active" },
];

const statusColors = {
  active: "bg-success/10 text-success border-success/20",
  transferred: "bg-muted text-muted-foreground border-muted",
  completed: "bg-primary/10 text-primary border-primary/20",
};

export default function Students() {
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");

  const filteredStudents = mockStudents.filter((student) => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.admNo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = gradeFilter === "all" || student.grade === gradeFilter;
    return matchesSearch && matchesGrade;
  });

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="page-header">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title font-display">Students</h1>
            <p className="page-subtitle">Manage student records and enrollment</p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Student
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border/50 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or admission number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              <SelectItem value="PP1">PP1</SelectItem>
              <SelectItem value="PP2">PP2</SelectItem>
              <SelectItem value="Grade 1">Grade 1</SelectItem>
              <SelectItem value="Grade 2">Grade 2</SelectItem>
              <SelectItem value="Grade 3">Grade 3</SelectItem>
              <SelectItem value="Grade 4">Grade 4</SelectItem>
              <SelectItem value="Grade 5">Grade 5</SelectItem>
              <SelectItem value="Grade 6">Grade 6</SelectItem>
              <SelectItem value="Grade 7">Grade 7</SelectItem>
              <SelectItem value="Grade 8">Grade 8</SelectItem>
              <SelectItem value="Grade 9">Grade 9</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Students Table */}
      <div className="data-table">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">
                  Adm No.
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">
                  Student Name
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">
                  Gender
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">
                  Grade
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">
                  Stream
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">
                  Parent/Guardian
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">
                  Status
                </th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-foreground">{student.admNo}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-medium text-primary">
                          {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-foreground">{student.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted-foreground">{student.gender}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-foreground">{student.grade}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted-foreground">{student.stream}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted-foreground">{student.parent}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={statusColors[student.status as keyof typeof statusColors]}>
                      {student.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2">
                          <Eye className="w-4 h-4" /> View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2">
                          <Edit className="w-4 h-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 text-destructive">
                          <Trash2 className="w-4 h-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Showing {filteredStudents.length} of {mockStudents.length} students
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <Button variant="outline" size="sm">
              Next
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
