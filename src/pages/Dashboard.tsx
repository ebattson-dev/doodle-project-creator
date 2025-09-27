import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { pushNotificationService } from "@/services/pushNotificationService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Target } from "lucide-react";

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
  push_enabled?: boolean;
}

interface FocusArea {
  id: string;
  title: string;
}

interface TodaysRep {
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
}

export default function Dashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>([]);
  const [todaysRep, setTodaysRep] = useState<TodaysRep | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize push notification service with toast
    pushNotificationService.setToast(toast);
  }, [toast]);

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

        // Fetch today's rep assignment
        const today = new Date().toISOString().split('T')[0];
        const { data: repData, error: repError } = await supabase
          .from('daily_rep_assignments')
          .select(`
            *,
            reps:rep_id (
              id,
              title,
              description,
              difficulty_level,
              estimated_time,
              focus_areas:focus_area_id(title)
            )
          `)
          .eq('user_id', user.id)
          .eq('assigned_date', today)
          .maybeSingle();

        if (repError) throw repError;
        setTodaysRep(repData);

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

  const handleToggleNotifications = async () => {
    setNotificationLoading(true);
    try {
      if (profile?.push_enabled) {
        await pushNotificationService.disableNotifications();
        setProfile(prev => prev ? { ...prev, push_enabled: false } : null);
        toast({
          title: "Notifications Disabled",
          description: "You won't receive daily rep notifications.",
        });
      } else {
        const success = await pushNotificationService.enableNotifications();
        if (success) {
          setProfile(prev => prev ? { ...prev, push_enabled: true } : null);
          toast({
            title: "Notifications Enabled",
            description: "You'll receive daily notifications for new reps!",
          });
        } else {
          toast({
            title: "Notification Setup Failed",
            description: "Unable to enable push notifications. Please check your device settings.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      toast({
        title: "Error",
        description: "Failed to update notification settings.",
        variant: "destructive",
      });
    } finally {
      setNotificationLoading(false);
    }
  };

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {profile.name}!</h1>
            <p className="text-muted-foreground">{profile.email}</p>
          </div>
          <Button
            variant={profile.push_enabled ? "default" : "outline"}
            onClick={handleToggleNotifications}
            disabled={notificationLoading}
          >
            {profile.push_enabled ? (
              <Bell className="w-4 h-4 mr-2" />
            ) : (
              <BellOff className="w-4 h-4 mr-2" />
            )}
            {notificationLoading ? "Loading..." : profile.push_enabled ? "Notifications On" : "Enable Notifications"}
          </Button>
        </div>

        {/* Today's Rep Section */}
        {todaysRep && (
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="w-5 h-5 mr-2" />
                Today's Rep
              </CardTitle>
              <CardDescription>
                {todaysRep.completed ? "Completed!" : "Ready for you to tackle"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{todaysRep.reps.title}</h3>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary">{todaysRep.reps.focus_areas?.title}</Badge>
                    <Badge variant="outline">{todaysRep.reps.difficulty_level}</Badge>
                    {todaysRep.reps.estimated_time && (
                      <Badge variant="outline">{todaysRep.reps.estimated_time} min</Badge>
                    )}
                  </div>
                </div>
                {todaysRep.reps.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {todaysRep.reps.description}
                  </p>
                )}
                <Button 
                  onClick={() => window.location.href = `/rep/${todaysRep.rep_id}`}
                  className="w-full"
                  variant={todaysRep.completed ? "secondary" : "default"}
                >
                  {todaysRep.completed ? "View Completed Rep" : "Start Your Rep"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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