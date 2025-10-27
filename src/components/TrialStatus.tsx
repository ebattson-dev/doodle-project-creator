import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Clock, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TrialStatusProps {
  compact?: boolean;
}

export function TrialStatus({ compact = false }: TrialStatusProps) {
  const { subscription, user } = useAuth();
  const navigate = useNavigate();
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrialStatus = async () => {
      if (!user) return;
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('trial_ends_at')
          .eq('user_id', user.id)
          .single();

        if (profile?.trial_ends_at) {
          const now = new Date();
          const trialEnd = new Date(profile.trial_ends_at);
          const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          setTrialDaysLeft(Math.max(0, daysLeft));
        }
      } catch (error) {
        console.error('Error fetching trial status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrialStatus();
  }, [user]);

  if (loading) return null;

  // If subscribed, show premium badge
  if (subscription?.subscribed) {
    if (compact) {
      return (
        <Badge variant="default" className="flex items-center gap-1">
          <Crown className="h-3 w-3" />
          Premium
        </Badge>
      );
    }
    
    return (
      <Card className="border-primary/50 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">Premium Active</p>
                <p className="text-sm text-muted-foreground">
                  Unlimited daily reps
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/subscription")}
            >
              Manage
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If in trial
  if (trialDaysLeft !== null && trialDaysLeft > 0) {
    if (compact) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Zap className="h-3 w-3" />
          {trialDaysLeft}d trial left
        </Badge>
      );
    }
    
    return (
      <Card className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-500" />
              <div>
                <p className="font-semibold">Free Trial Active</p>
                <p className="text-sm text-muted-foreground">
                  {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} remaining
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => navigate("/subscription")}
            >
              Upgrade Now
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Trial ended, not subscribed
  if (compact) {
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        1 rep/week
      </Badge>
    );
  }

  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-semibold">Trial Ended</p>
              <p className="text-sm text-muted-foreground">
                1 free rep per week or upgrade for unlimited
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => navigate("/subscription")}
          >
            Upgrade
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
