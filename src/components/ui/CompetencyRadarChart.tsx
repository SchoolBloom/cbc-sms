import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PERFORMANCE_LEVELS } from "@/hooks/useAssessments";

interface CompetencyData {
  subject: string;
  // Core competencies
  communication?: number;
  criticalThinking?: number;
  creativity?: number;
  collaboration?: number;
  problemSolving?: number;
  // Overall score (0-100)
  score?: number;
  // Performance level
  level?: string;
}

interface CompetencyRadarChartProps {
  data: CompetencyData[];
  title?: string;
  showLegend?: boolean;
}

/**
 * Map performance levels to numeric scores for radar chart
 */
function normalizeLevel(level?: string): string {
  return (level || "").trim().toLowerCase();
}

function getLevelScore(level?: string): number {
  switch (normalizeLevel(level)) {
    case "exceeds":
    case "ee":
      return 100;
    case "meets":
    case "me":
      return 75;
    case "approaches":
    case "ae":
      return 50;
    case "below":
    case "be":
      return 25;
    default:
      return 0;
  }
}

/**
 * Get color for performance level
 */
function getLevelColor(level?: string): string {
  const found = PERFORMANCE_LEVELS.find((p) => p.level === normalizeLevel(level));
  return found?.color || "bg-muted";
}

export function CompetencyRadarChart({
  data,
  title = "Core Competency Growth",
  showLegend = true,
}: CompetencyRadarChartProps) {
  // Transform data for radar chart
  // Aggregate by learning area and calculate average competency scores
  const competencyMap = new Map<string, { total: number; count: number }>();

  data.forEach((record) => {
    const subject = record.subject;
    const score = record.score ?? getLevelScore(record.level);
    
    const existing = competencyMap.get(subject) || { total: 0, count: 0 };
    competencyMap.set(subject, {
      total: existing.total + score,
      count: existing.count + 1,
    });
  });

  // Convert to chart data
  const chartData = Array.from(competencyMap.entries()).map(([subject, { total, count }]) => ({
    subject: subject.length > 15 ? subject.substring(0, 12) + "..." : subject,
    fullSubject: subject,
    score: Math.round(total / count),
    level: data.find((d) => d.subject === subject)?.level,
  }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No competency data available yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {title}
        </CardTitle>
        <CardDescription>
          Student growth across learning areas based on CBC performance levels
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                axisLine={false}
              />
              <Radar
                name="Score"
                dataKey="score"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-background border border-border rounded-lg p-3 shadow-md">
                        <p className="font-medium text-foreground">{data.fullSubject}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-muted-foreground">Score:</span>
                          <span className="font-semibold">{data.score}%</span>
                        </div>
                        {data.level && (
                          <Badge className={`mt-2 ${getLevelColor(data.level)}`}>
                            {PERFORMANCE_LEVELS.find((p) => p.level === normalizeLevel(data.level))?.code || data.level}
                          </Badge>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {showLegend && (
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => (
                    <span className="text-muted-foreground text-sm">Performance Score</span>
                  )}
                />
              )}
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend for performance levels */}
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">CBC Performance Levels:</p>
          <div className="flex flex-wrap gap-2">
            {PERFORMANCE_LEVELS.map((level) => (
              <div key={level.level} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-full ${level.color.split(" ")[0]}`} />
                <span className="text-xs text-muted-foreground">
                  {level.code}: {level.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Component to display qualitative notes from assessments
 */
interface QualitativeNotesProps {
  coreCompetencyNotes?: string | null;
  valuesNotes?: string | null;
  className?: string;
}

export function QualitativeNotesDisplay({
  coreCompetencyNotes,
  valuesNotes,
  className,
}: QualitativeNotesProps) {
  const hasNotes = coreCompetencyNotes || valuesNotes;

  if (!hasNotes) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Teacher's Qualitative Feedback</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {coreCompetencyNotes && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Core Competencies
            </p>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-foreground">{coreCompetencyNotes}</p>
            </div>
          </div>
        )}
        {valuesNotes && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              CBC Values
            </p>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-foreground">{valuesNotes}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}