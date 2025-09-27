import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  age?: number;
  gender?: string;
  life_stage?: string;
  job_title?: string;
  focus_area_ids: string[];
  current_level?: string;
  goals?: string;
  rep_style?: string;
  profile_picture_url?: string;
}

interface FocusArea {
  id: string;
  title: string;
}

export default function Dashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          toast({
            title: "Authentication Error",
            description: "Please log in to view your dashboard.",
            variant: "destructive",
          });
          return;
        }

        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        setProfile(data);

        // Fetch focus areas if user has any selected
        if (data?.focus_area_ids && data.focus_area_ids.length > 0) {
          const { data: focusAreasData, error: focusAreasError } = await supabase
            .from('focus_areas')
            .select('id, title')
            .in('id', data.focus_area_ids);

          if (focusAreasError) throw focusAreasError;
          setFocusAreas(focusAreasData || []);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast({
          title: "Error",
          description: "Failed to load profile data.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Profile Found</CardTitle>
            <CardDescription>
              You haven't completed your profile setup yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Please complete the onboarding process to access your dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center space-x-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={profile.profile_picture_url} alt={profile.name} />
            <AvatarFallback className="text-lg">
              {profile.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {profile.name}!</h1>
            <p className="text-muted-foreground">{profile.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {profile.age && <p><strong>Age:</strong> {profile.age}</p>}
              {profile.gender && <p><strong>Gender:</strong> {profile.gender}</p>}
              {profile.life_stage && <p><strong>Life Stage:</strong> {profile.life_stage}</p>}
              {profile.job_title && <p><strong>Job Title:</strong> {profile.job_title}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Focus Areas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {focusAreas.map((area) => (
                  <Badge key={area.id} variant="secondary">
                    {area.title}
                  </Badge>
                ))}
                {focusAreas.length === 0 && (
                  <p className="text-sm text-muted-foreground">No focus areas selected</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {profile.current_level && (
                <p><strong>Current Level:</strong> {profile.current_level}</p>
              )}
              {profile.rep_style && (
                <p><strong>Rep Style:</strong> {profile.rep_style}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {profile.goals && (
          <Card>
            <CardHeader>
              <CardTitle>Your Goals</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{profile.goals}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}