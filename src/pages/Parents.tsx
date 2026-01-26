import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Phone, Mail, Users, Loader2, MoreHorizontal, Eye, Edit, Trash2, UserCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useAssignParentRole, useParentsWithChildren, useDeleteParent, Parent } from "@/hooks/useParents";
import { AddParentDialog } from "@/components/parents/AddParentDialog";
import { ParentProfileDialog } from "@/components/parents/ParentProfileDialog";
import { EditParentDialog } from "@/components/parents/EditParentDialog";

export default function Parents() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewParent, setViewParent] = useState<Parent | null>(null);
  const [editParent, setEditParent] = useState<Parent | null>(null);
  
  const { data: parents = [], isLoading, error } = useParentsWithChildren();
  const assignParentRole = useAssignParentRole();
  const deleteParent = useDeleteParent();
  
  const canWrite = user?.role === "admin";

  const filteredParents = parents.filter((parent) => 
    parent.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    parent.phone.includes(searchQuery)
  );

  const parentsWithPhone = parents.filter((p) => p.phone?.trim()).length;
  const phonePercentage = parents.length > 0 ? Math.round((parentsWithPhone / parents.length) * 100) : 0;
  const parentsWithEmail = parents.filter((p) => p.email).length;
  const emailPercentage = parents.length > 0 ? Math.round((parentsWithEmail / parents.length) * 100) : 0;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="page-header">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title font-display">Parents & Guardians</h1>
            <p className="page-subtitle">Manage parent contacts and communications</p>
          </div>
          {canWrite && <AddParentDialog />}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-foreground">{parents.length}</p>
            <p className="text-sm text-muted-foreground">Total Parents</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
            <Phone className="w-6 h-6 text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-foreground">{phonePercentage}%</p>
            <p className="text-sm text-muted-foreground">With Phone</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
            <Mail className="w-6 h-6 text-info" />
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-foreground">{emailPercentage}%</p>
            <p className="text-sm text-muted-foreground">With Email</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-card rounded-xl border border-border/50 p-4 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search parents by name or phone..." 
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Parents Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-destructive">
          Failed to load parents. Please try again.
        </div>
      ) : filteredParents.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-border/50">
          {parents.length === 0 ? "No parents registered yet. Add your first parent!" : "No parents match your search."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredParents.map((parent) => (
            <div key={parent.id} className="bg-card rounded-xl border border-border/50 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-semibold text-primary">
                    {parent.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-foreground">{parent.full_name}</h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2" onClick={() => setViewParent(parent)}>
                          <Eye className="w-4 h-4" /> View Details
                        </DropdownMenuItem>
                        {canWrite && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                className="gap-2"
                                disabled={!parent.email}
                                onSelect={(event) => event.preventDefault()}
                              >
                                <UserCheck className="w-4 h-4" /> Grant Portal Access
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Grant parent access?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This assigns the Parent role to {parent.full_name}. They must have already signed up
                                  with {parent.email || "their email"}.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    if (parent.email) {
                                      assignParentRole.mutate({ parentId: parent.id, email: parent.email });
                                    }
                                  }}
                                  disabled={!parent.email || assignParentRole.isPending}
                                >
                                  {assignParentRole.isPending ? "Granting..." : "Grant Access"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        {canWrite && (
                          <>
                            <DropdownMenuItem className="gap-2" onClick={() => setEditParent(parent)}>
                              <Edit className="w-4 h-4" /> Edit
                            </DropdownMenuItem>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  className="gap-2 text-destructive"
                                  onSelect={(event) => event.preventDefault()}
                                >
                                  <Trash2 className="w-4 h-4" /> Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete parent?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This permanently deletes {parent.full_name} and unlinks their children.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteParent.mutate(parent.id)}
                                    disabled={deleteParent.isPending}
                                  >
                                    {deleteParent.isPending ? "Deleting..." : "Delete"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{parent.phone}</span>
                  </div>
                  {parent.email && (
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground truncate">{parent.email}</span>
                    </div>
                  )}
                </div>
              </div>
              {parent.children && parent.children.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">Children:</p>
                  <div className="flex flex-wrap gap-2">
                    {parent.children.map((child) => (
                      <Badge key={child.id} variant="secondary" className="text-xs">
                        {child.full_name} {child.classes ? `(${child.classes.grade}${child.classes.stream})` : ""}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ParentProfileDialog
        parent={viewParent}
        open={!!viewParent}
        onOpenChange={(open) => !open && setViewParent(null)}
      />
      <EditParentDialog
        parent={editParent}
        open={!!editParent}
        onOpenChange={(open) => !open && setEditParent(null)}
      />
    </DashboardLayout>
  );
}
