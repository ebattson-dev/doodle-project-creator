import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";

interface UpcomingRep {
  id: string;
  rep_id: string;
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

interface UpcomingRepsProps {
  upcomingReps: UpcomingRep[];
}

export function UpcomingReps({ upcomingReps }: UpcomingRepsProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    }
    
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 7) {
      return `In ${diffDays} days`;
    }
    
    return date.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          Upcoming Reps
        </CardTitle>
        <CardDescription>
          Your next {upcomingReps.length} scheduled reps
        </CardDescription>
      </CardHeader>
      <CardContent>
        {upcomingReps.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming reps scheduled</p>
        ) : (
          <div className="space-y-3">
            {upcomingReps.map((rep) => (
              <div key={rep.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{rep.reps.title}</h4>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {rep.reps.focus_areas?.title}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {rep.reps.difficulty_level}
                    </Badge>
                    {rep.reps.estimated_time && (
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {rep.reps.estimated_time}m
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(rep.assigned_date)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}