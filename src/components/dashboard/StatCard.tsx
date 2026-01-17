import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "accent" | "success";
}

const variantStyles = {
  default: "bg-card",
  primary: "bg-primary text-primary-foreground",
  accent: "bg-accent text-accent-foreground",
  success: "bg-success text-success-foreground",
};

const iconVariantStyles = {
  default: "bg-primary/10 text-primary",
  primary: "bg-primary-foreground/20 text-primary-foreground",
  accent: "bg-accent-foreground/20 text-accent-foreground",
  success: "bg-success-foreground/20 text-success-foreground",
};

export function StatCard({ title, value, subtitle, icon: Icon, trend, variant = "default" }: StatCardProps) {
  return (
    <div className={cn("stat-card", variantStyles[variant])}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={cn(
            "text-sm font-medium",
            variant === "default" ? "text-muted-foreground" : "opacity-80"
          )}>
            {title}
          </p>
          <p className="text-3xl font-bold font-display mt-2">{value}</p>
          {subtitle && (
            <p className={cn(
              "text-sm mt-1",
              variant === "default" ? "text-muted-foreground" : "opacity-70"
            )}>
              {subtitle}
            </p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span className={cn(
                "text-sm font-medium",
                trend.isPositive ? "text-success" : "text-destructive"
              )}>
                {trend.isPositive ? "+" : ""}{trend.value}%
              </span>
              <span className={cn(
                "text-xs",
                variant === "default" ? "text-muted-foreground" : "opacity-60"
              )}>
                vs last term
              </span>
            </div>
          )}
        </div>
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
          iconVariantStyles[variant]
        )}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
