import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, CheckCircle, SkipForward, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TodaysRepProps {
  rep: {
    id: string;
    rep_id: string;
    completed: boolean;
    assigned_date: string;
    reps: {
      id: string;
      title: string;
      description: string;
      difficulty_level: string;
      estimated_time: number;
      focus_areas: {
        title: string;
      };
    };
  };
  onUpdate: () => void;
}

export function TodaysRep({ rep, onUpdate }: TodaysRepProps) {
  const { toast } = useToast();

  const handleMarkComplete = async () => {
    try {
      const { error } = await supabase
        .from('daily_rep_assignments')
        .update({ 
          completed: true, 
          completed_at: new Date().toISOString() 
        })
        .eq('id', rep.id);

      if (error) throw error;

      toast({
        title: "Rep Completed!",
        description: "Great job on completing today's rep.",
      });
      onUpdate();
    } catch (error) {
      console.error('Error marking rep complete:', error);
      toast({
        title: "Error",
        description: "Failed to mark rep as complete.",
        variant: "destructive",
      });
    }
  };

  const handleSkip = async () => {
    try {
      const { error } = await supabase
        .from('daily_rep_assignments')
        .update({ completed: true })
        .eq('id', rep.id);

      if (error) throw error;

      toast({
        title: "Rep Skipped",
        description: "You can always come back to this rep later.",
      });
      onUpdate();
    } catch (error) {
      console.error('Error skipping rep:', error);
      toast({
        title: "Error",
        description: "Failed to skip rep.",
        variant: "destructive",
      });
    }
  };

  const handleReplace = async () => {
    try {
      // Get user profile to find focus areas and level
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('focus_area_ids, current_level')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      // Find a different rep with the same criteria
      const { data: alternativeReps } = await supabase
        .from('reps')
        .select('id')
        .in('focus_area_id', profile.focus_area_ids)
        .eq('difficulty_level', profile.current_level || 'Beginner')
        .neq('id', rep.rep_id)
        .limit(10);

      if (!alternativeReps || alternativeReps.length === 0) {
        toast({
          title: "No Alternatives",
          description: "No alternative reps found for your preferences.",
          variant: "destructive",
        });
        return;
      }

      // Pick a random alternative
      const randomRep = alternativeReps[Math.floor(Math.random() * alternativeReps.length)];

      // Update the assignment
      const { error } = await supabase
        .from('daily_rep_assignments')
        .update({ rep_id: randomRep.id })
        .eq('id', rep.id);

      if (error) throw error;

      toast({
        title: "Rep Replaced",
        description: "Your daily rep has been replaced with a new one.",
      });
      onUpdate();
    } catch (error) {
      console.error('Error replacing rep:', error);
      toast({
        title: "Error",
        description: "Failed to replace rep.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Target className="w-5 h-5 mr-2" />
          Today's Rep
        </CardTitle>
        <CardDescription>
          {rep.completed ? "Completed!" : "Ready for you to tackle"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg">{rep.reps.title}</h3>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary">{rep.reps.focus_areas?.title}</Badge>
              <Badge variant="outline">{rep.reps.difficulty_level}</Badge>
              {rep.reps.estimated_time && (
                <Badge variant="outline">{rep.reps.estimated_time} min</Badge>
              )}
            </div>
          </div>
          {rep.reps.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {rep.reps.description}
            </p>
          )}
          
          {rep.completed ? (
            <Button 
              onClick={() => window.location.href = `/rep/${rep.rep_id}`}
              className="w-full"
              variant="secondary"
            >
              View Completed Rep
            </Button>
          ) : (
            <div className="space-y-2">
              <Button 
                onClick={() => window.location.href = `/rep/${rep.rep_id}`}
                className="w-full"
              >
                Start Your Rep
              </Button>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkComplete}
                  className="flex items-center gap-1"
                >
                  <CheckCircle className="w-3 h-3" />
                  Complete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSkip}
                  className="flex items-center gap-1"
                >
                  <SkipForward className="w-3 h-3" />
                  Skip
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReplace}
                  className="flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Replace
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}