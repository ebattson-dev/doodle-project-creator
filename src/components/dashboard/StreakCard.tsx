import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Trophy, Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface StreakStats {
  current_streak: number;
  longest_streak: number;
  last_completed_date: string | null;
}

export function StreakCard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<StreakStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStreakStats = async () => {
      if (!user) return;
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('current_streak, longest_streak, last_completed_date')
          .eq('user_id', user.id)
          .single();

        if (profile) {
          setStats({
            current_streak: profile.current_streak || 0,
            longest_streak: profile.longest_streak || 0,
            last_completed_date: profile.last_completed_date,
          });
        }
      } catch (error) {
        console.error('Error fetching streak stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStreakStats();

    // Set up real-time subscription for streak updates
    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          const newData = payload.new as any;
          setStats({
            current_streak: newData.current_streak || 0,
            longest_streak: newData.longest_streak || 0,
            last_completed_date: newData.last_completed_date,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (loading || !stats) {
    return null;
  }

  const isStreakActive = stats.last_completed_date === new Date().toISOString().split('T')[0] ||
                         stats.last_completed_date === new Date(Date.now() - 86400000).toISOString().split('T')[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className={`h-5 w-5 ${isStreakActive ? 'text-orange-500' : 'text-muted-foreground'}`} />
          Your Streak
        </CardTitle>
        <CardDescription>Keep the momentum going</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex flex-col items-center gap-1">
              <Flame className={`h-8 w-8 ${stats.current_streak > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
              <p className="text-3xl font-bold">{stats.current_streak}</p>
              <p className="text-xs text-muted-foreground">Current</p>
            </div>
          </div>
          
          <div className="text-center border-l border-r">
            <div className="flex flex-col items-center gap-1">
              <Trophy className="h-8 w-8 text-yellow-500" />
              <p className="text-3xl font-bold">{stats.longest_streak}</p>
              <p className="text-xs text-muted-foreground">Best</p>
            </div>
          </div>
          
          <div className="text-center">
            <div className="flex flex-col items-center gap-1">
              <Calendar className="h-8 w-8 text-primary" />
              <p className="text-3xl font-bold">
                {stats.last_completed_date ? 
                  new Date(stats.last_completed_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 
                  '-'
                }
              </p>
              <p className="text-xs text-muted-foreground">Last Rep</p>
            </div>
          </div>
        </div>

        {stats.current_streak > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
            <p className="text-sm text-center">
              {isStreakActive ? (
                <>🔥 <strong>{stats.current_streak} day{stats.current_streak !== 1 ? 's' : ''}</strong> streak active! Keep it going!</>
              ) : (
                <>Complete today's rep to continue your streak!</>
              )}
            </p>
          </div>
        )}

        {stats.current_streak === 0 && (
          <div className="mt-4 p-3 rounded-lg bg-muted">
            <p className="text-sm text-center text-muted-foreground">
              Complete your first rep to start a streak! 🚀
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
