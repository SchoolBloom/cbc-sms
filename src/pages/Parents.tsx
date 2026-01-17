import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Phone, Mail, Users } from "lucide-react";

const parents = [
  { id: 1, name: "Mary Kamau", phone: "+254 712 345 678", email: "mary.kamau@email.com", children: ["Grace Wanjiku Kamau (4A)"], status: "active" },
  { id: 2, name: "John Otieno", phone: "+254 723 456 789", email: "john.otieno@email.com", children: ["Peter Ochieng Otieno (6B)"], status: "active" },
  { id: 3, name: "James Mwangi", phone: "+254 734 567 890", email: "james.mwangi@email.com", children: ["Faith Njeri Mwangi (3A)", "Brian Mwangi (PP1)"], status: "active" },
  { id: 4, name: "Samuel Korir", phone: "+254 745 678 901", email: "samuel.korir@email.com", children: ["David Kipchoge Korir (7A)"], status: "active" },
  { id: 5, name: "Michael Odhiambo", phone: "+254 756 789 012", email: null, children: ["Sarah Akinyi Odhiambo (PP2)"], status: "active" },
  { id: 6, name: "Joseph Ngugi", phone: "+254 767 890 123", email: "joseph.ngugi@email.com", children: ["Joy Wambui Ngugi (5A)"], status: "active" },
];

export default function Parents() {
  return (
    <DashboardLayout>
      {/* Header */}
      <div className="page-header">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title font-display">Parents & Guardians</h1>
            <p className="page-subtitle">Manage parent contacts and communications</p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Parent
          </Button>
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
            <p className="text-2xl font-bold font-display text-foreground">100%</p>
            <p className="text-sm text-muted-foreground">With Phone</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
            <Mail className="w-6 h-6 text-info" />
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-foreground">83%</p>
            <p className="text-sm text-muted-foreground">With Email</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-card rounded-xl border border-border/50 p-4 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search parents by name or phone..." className="pl-10" />
        </div>
      </div>

      {/* Parents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {parents.map((parent) => (
          <div key={parent.id} className="bg-card rounded-xl border border-border/50 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-semibold text-primary">
                  {parent.name.split(" ").map((n) => n[0]).join("")}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground">{parent.name}</h3>
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
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Children:</p>
              <div className="flex flex-wrap gap-2">
                {parent.children.map((child, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {child}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 gap-2">
                <Phone className="w-3 h-3" />
                Call
              </Button>
              <Button variant="outline" size="sm" className="flex-1 gap-2">
                <Mail className="w-3 h-3" />
                Message
              </Button>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
