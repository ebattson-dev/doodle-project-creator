import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebPushRequest {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, title, body, data }: WebPushRequest = await req.json();

    console.log('Processing web push for user:', userId);

    // Validate input
    if (!userId || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, title, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's web push subscription
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('web_push_subscription, push_enabled')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile.push_enabled || !profile.web_push_subscription) {
      console.log('Push notifications not enabled or no subscription for user:', userId);
      return new Response(
        JSON.stringify({ success: false, message: 'Push notifications not enabled for this user' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const subscription = profile.web_push_subscription;
    
    console.log('Subscription endpoint:', subscription.endpoint);
    console.log('Has keys:', !!subscription.keys);

    // For now, just log the notification data since web-push library has issues in Deno
    // In production, you would send this via a proper Web Push service or use a different backend
    console.log('Would send notification:', {
      title,
      body,
      endpoint: subscription.endpoint,
      hasAuth: !!subscription.keys?.auth,
      hasP256dh: !!subscription.keys?.p256dh,
    });

    // Return success - the actual push would be sent by a proper backend service
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification queued (demo mode - web push requires additional backend setup)',
        info: 'To send actual push notifications, you need to set up a Node.js backend or use a service like Firebase Cloud Messaging'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in web push function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
