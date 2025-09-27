import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, CheckCircle } from "lucide-react";

interface CompletedRep {
  id: string;
  completed_at: string;
  assigned_date: string;
  reps: {
    title: string;
    difficulty_level: string;
    estimated_time: number;
    focus_areas: {
      title: string;
    };
  };
}

interface RecentProgressProps {
  completedReps: CompletedRep[];
}

export function RecentProgress({ completedReps }: RecentProgressProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = today.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  };

  const completionRate = completedReps.length > 0 ? 
    Math.round((completedReps.length / 7) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <TrendingUp className="w-5 h-5 mr-2" />
          Recent Progress
        </CardTitle>
        <CardDescription>
          {completedReps.length} reps completed in the last 7 days ({completionRate}% completion rate)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {completedReps.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">No completed reps in the last 7 days</p>
            <p className="text-xs text-muted-foreground mt-1">Start completing reps to see your progress here!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {completedReps.map((rep) => (
              <div key={rep.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{rep.reps.title}</h4>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {rep.reps.focus_areas?.title}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {rep.reps.difficulty_level}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(rep.completed_at || rep.assigned_date)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}