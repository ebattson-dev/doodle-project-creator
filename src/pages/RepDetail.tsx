import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Target, CheckCircle, ArrowLeft } from "lucide-react";

interface Rep {
  id: string;
  title: string;
  description: string;
  difficulty_level: string;
  format: string;
  estimated_time: number;
  focus_areas: {
    title: string;
  };
}

interface Assignment {
  id: string;
  completed: boolean;
  assigned_date: string;
}

export default function RepDetail() {
  const { repId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rep, setRep] = useState<Rep | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    const fetchRepDetails = async () => {
      if (!repId) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/');
          return;
        }

        // Fetch rep details
        const { data: repData, error: repError } = await supabase
          .from('reps')
          .select(`
            *,
            focus_areas:focus_area_id(title)
          `)
          .eq('id', repId)
          .single();

        if (repError) throw repError;

        // Fetch user's assignment for this rep
        const { data: assignmentData, error: assignmentError } = await supabase
          .from('daily_rep_assignments')
          .select('*')
          .eq('user_id', user.id)
          .eq('rep_id', repId)
          .maybeSingle();

        if (assignmentError) throw assignmentError;

        setRep(repData);
        setAssignment(assignmentData);
      } catch (error) {
        console.error('Error fetching rep details:', error);
        toast({
          title: "Error",
          description: "Failed to load rep details.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRepDetails();
  }, [repId, navigate, toast]);

  const handleCompleteRep = async () => {
    if (!assignment) return;

    setCompleting(true);
    try {
      const { error } = await supabase
        .from('daily_rep_assignments')
        .update({
          completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('id', assignment.id);

      if (error) throw error;

      setAssignment({ ...assignment, completed: true });
      toast({
        title: "Rep Completed! 🎉",
        description: "Great job completing your daily rep!",
      });
    } catch (error) {
      console.error('Error completing rep:', error);
      toast({
        title: "Error",
        description: "Failed to mark rep as completed.",
        variant: "destructive",
      });
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading rep details...</p>
        </div>
      </div>
    );
  }

  if (!rep) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Rep Not Found</CardTitle>
            <CardDescription>
              The requested rep could not be found.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <CardTitle className="text-2xl">{rep.title}</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="secondary">{rep.focus_areas?.title}</Badge>
                  <Badge variant="outline">{rep.difficulty_level}</Badge>
                  <Badge variant="outline">{rep.format}</Badge>
                </div>
              </div>
              {assignment?.completed && (
                <CheckCircle className="w-8 h-8 text-green-500" />
              )}
            </div>
            {rep.estimated_time && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="w-4 h-4 mr-1" />
                {rep.estimated_time} minutes
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground leading-relaxed">
                {rep.description || "No description provided."}
              </p>
            </div>

            {assignment && (
              <div className="border-t pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Daily Assignment</p>
                    <p className="text-sm text-muted-foreground">
                      Assigned on {new Date(assignment.assigned_date).toLocaleDateString()}
                    </p>
                  </div>
                  {!assignment.completed ? (
                    <Button onClick={handleCompleteRep} disabled={completing}>
                      <Target className="w-4 h-4 mr-2" />
                      {completing ? "Marking Complete..." : "Mark as Complete"}
                    </Button>
                  ) : (
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Completed!
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}