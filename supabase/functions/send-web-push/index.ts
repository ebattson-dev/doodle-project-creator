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
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;

    // Prepare the notification payload
    const payload = JSON.stringify({
      title,
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: data || {},
    });

    // Send web push notification using web-push protocol
    const endpoint = subscription.endpoint;
    const auth = subscription.keys.auth;
    const p256dh = subscription.keys.p256dh;

    // Use web-push library for sending
    const webpush = await import('https://esm.sh/web-push@3.6.6');
    
    webpush.setVapidDetails(
      'mailto:support@dailyrep.app',
      vapidPublicKey,
      vapidPrivateKey
    );

    await webpush.sendNotification(
      { endpoint, keys: { auth, p256dh } },
      payload
    );

    console.log('Web push notification sent successfully to user:', userId);

    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error sending web push notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
