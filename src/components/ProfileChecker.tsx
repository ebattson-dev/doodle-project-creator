import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface ProfileCheckerProps {
  children: React.ReactNode;
}

export const ProfileChecker = ({ children }: ProfileCheckerProps) => {
  const { user, loading: authLoading } = useAuth();
  const [profileLoading, setProfileLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkProfile = async () => {
      if (!user || authLoading) {
        setProfileLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking profile:', error);
          setProfileLoading(false);
          return;
        }

        const profileExists = !!data;
        setHasProfile(profileExists);

        // Handle redirects based on profile status and current location
        if (profileExists && location.pathname === '/onboarding') {
          // User has profile but is on onboarding page - redirect to dashboard
          navigate('/dashboard', { replace: true });
        } else if (!profileExists && location.pathname !== '/onboarding' && location.pathname !== '/auth' && location.pathname !== '/' && location.pathname !== '/debug') {
          // User doesn't have profile but is trying to access protected pages - redirect to onboarding
          navigate('/onboarding', { replace: true });
        }
      } catch (error) {
        console.error('Error checking profile:', error);
      } finally {
        setProfileLoading(false);
      }
    };

    checkProfile();
  }, [user, authLoading, navigate, location.pathname]);

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};