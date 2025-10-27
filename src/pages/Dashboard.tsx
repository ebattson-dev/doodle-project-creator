import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { pushNotificationService } from "@/services/pushNotificationService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Bell, BellOff } from "lucide-react";
import { TodaysRep } from "@/components/dashboard/TodaysRep";
import { UpcomingReps } from "@/components/dashboard/UpcomingReps";
import { RecentProgress } from "@/components/dashboard/RecentProgress";
import { useNavigate } from "react-router-dom";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  age?: number;
  gender?: string;
  life_stage?: string;
  job_title?: string;
  focus_areas: string[];
  current_level?: string;
  goals?: string;
  rep_style?: string;
  profile_picture?: string;
  push_enabled?: boolean;
  push_token?: string;
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

export default function Dashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>([]);
  const [todaysRep, setTodaysRep] = useState<TodaysRep | null>(null);
  const [upcomingReps, setUpcomingReps] = useState<UpcomingRep[]>([]);
  const [completedReps, setCompletedReps] = useState<CompletedRep[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingRep, setGeneratingRep] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    pushNotificationService.setToast(toast);
  }, [toast]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        setProfile(data);

        // Fetch focus areas if user has any selected
        if (data?.focus_areas && data.focus_areas.length > 0) {
          const { data: focusAreasData, error: focusAreasError } = await supabase
            .from('focus_areas')
            .select('id, title')
            .in('title', data.focus_areas);

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

        // Fetch upcoming reps (next 5 days)
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 5);
        const { data: upcomingData, error: upcomingError } = await supabase
          .from('daily_rep_assignments')
          .select(`
            id,
            rep_id,
            assigned_date,
            reps:rep_id (
              title,
              difficulty_level,
              estimated_time,
              focus_areas:focus_area_id(title)
            )
          `)
          .eq('user_id', user.id)
          .gt('assigned_date', today)
          .lte('assigned_date', futureDate.toISOString().split('T')[0])
          .eq('completed', false)
          .order('assigned_date', { ascending: true })
          .limit(5);

        if (upcomingError) throw upcomingError;
        setUpcomingReps(upcomingData || []);

        // Fetch recent completed reps (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const { data: completedData, error: completedError } = await supabase
          .from('daily_rep_assignments')
          .select(`
            id,
            completed_at,
            assigned_date,
            reps:rep_id (
              title,
              difficulty_level,
              estimated_time,
              focus_areas:focus_area_id(title)
            )
          `)
          .eq('user_id', user.id)
          .eq('completed', true)
          .gte('assigned_date', sevenDaysAgo.toISOString().split('T')[0])
          .order('completed_at', { ascending: false });

        if (completedError) throw completedError;
        setCompletedReps(completedData || []);

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

  const handleRepUpdate = () => {
    // Refetch data when rep is updated
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const today = new Date().toISOString().split('T')[0];
        
        // Refetch today's rep
        const { data: repData } = await supabase
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

        setTodaysRep(repData);

        // Refetch completed reps
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const { data: completedData } = await supabase
          .from('daily_rep_assignments')
          .select(`
            id,
            completed_at,
            assigned_date,
            reps:rep_id (
              title,
              difficulty_level,
              estimated_time,
              focus_areas:focus_area_id(title)
            )
          `)
          .eq('user_id', user.id)
          .eq('completed', true)
          .gte('assigned_date', sevenDaysAgo.toISOString().split('T')[0])
          .order('completed_at', { ascending: false });

        setCompletedReps(completedData || []);
      } catch (error) {
        console.error('Error refetching data:', error);
      }
    };

    fetchData();
  };

  const handleGenerateDailyRep = async () => {
    setGeneratingRep(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-daily-rep', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) {
        console.error('Error generating rep:', error);
        toast({
          title: "Generation Failed",
          description: error.message || "Failed to generate daily rep. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Daily Rep Generated! 🎯",
        description: "Your personalized rep has been created. Check it out below!",
      });

      // Refresh the dashboard to show the new rep
      window.location.reload();
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGeneratingRep(false);
    }
  };

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
            title: "Notifications Enabled! 🔔",
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
            <CardTitle>Complete Your Profile</CardTitle>
            <CardDescription>
              You haven't completed your profile setup yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please complete the onboarding process to access your dashboard.
            </p>
            <Button onClick={() => navigate("/onboarding")} className="w-full">
              Complete Setup
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar>
              <AvatarImage src={profile?.profile_picture} />
              <AvatarFallback>{profile?.full_name?.charAt(0)?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">Welcome back, {profile?.full_name}!</h2>
              <p className="text-muted-foreground">Ready for today's challenge?</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/profile")}
              title="View Profile"
            >
              <User className="h-4 w-4" />
            </Button>

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
        </div>

        {/* AI Rep Generator */}
        <Card>
          <CardHeader>
            <CardTitle>Generate Your Daily Rep 🤖</CardTitle>
            <CardDescription>
              Get a personalized daily challenge tailored to your profile, goals, and focus areas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleGenerateDailyRep} 
              disabled={generatingRep}
              className="w-full"
              size="lg"
            >
              {generatingRep ? "Generating Your Personalized Rep..." : "Generate AI-Powered Daily Rep"}
            </Button>
          </CardContent>
        </Card>

        {/* Today's Rep Section */}
        {todaysRep && (
          <TodaysRep rep={todaysRep} onUpdate={handleRepUpdate} />
        )}

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <UpcomingReps upcomingReps={upcomingReps} />
          <RecentProgress completedReps={completedReps} />
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