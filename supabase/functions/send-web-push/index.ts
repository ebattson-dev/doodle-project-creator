import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { initializeApp, cert } from "https://esm.sh/firebase-admin@12.0.0/app";
import { getMessaging } from "https://esm.sh/firebase-admin@12.0.0/messaging";

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

// Initialize Firebase Admin
let firebaseApp: any = null;
const initializeFirebase = () => {
  if (firebaseApp) return firebaseApp;
  
  const serviceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT') || '{}');
  firebaseApp = initializeApp({
    credential: cert(serviceAccount)
  });
  
  return firebaseApp;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, title, body, data }: WebPushRequest = await req.json();

    console.log('Processing FCM push for user:', userId);

    // Validate input
    if (!userId || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, title, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's FCM token
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('push_token, push_enabled')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile.push_enabled || !profile.push_token) {
      console.log('Push notifications not enabled or no FCM token for user:', userId);
      return new Response(
        JSON.stringify({ success: false, message: 'Push notifications not enabled for this user' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fcmToken = profile.push_token;
    console.log('Sending FCM notification to token:', fcmToken.substring(0, 20) + '...');

    // Initialize Firebase and send notification
    initializeFirebase();
    const messaging = getMessaging();

    const message = {
      token: fcmToken,
      notification: {
        title,
        body,
      },
      data: data || {},
      webpush: {
        fcmOptions: {
          link: data?.url || '/'
        }
      }
    };

    const response = await messaging.send(message);
    console.log('FCM notification sent successfully:', response);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification sent successfully',
        messageId: response
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in FCM push function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
