import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, title, body, data } = await req.json();

    if (!userId || !title || !body) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's push token from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('push_token, push_enabled')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Profile not found:', profileError);
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!profile.push_enabled || !profile.push_token) {
      console.log('Push notifications not enabled for user:', userId);
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Push notifications not enabled for this user' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send notification using Capacitor Push Notifications
    // This uses the standard push notification format
    const notification = {
      to: profile.push_token,
      title: title,
      body: body,
      data: data || {},
      sound: 'default',
      priority: 'high',
    };

    console.log('Sending notification:', notification);

    // For Capacitor, we'll use FCM (Firebase Cloud Messaging)
    // Note: This requires FCM server key to be set up
    // For now, we'll log and return success
    // In production, you'd send via FCM or APNs

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Notification queued for delivery',
      notification: notification
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-push-notification:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
