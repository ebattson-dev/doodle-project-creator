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
    console.log('[AUTO-GENERATE] Starting automatic rep generation check...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current time in UTC
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
    
    console.log(`[AUTO-GENERATE] Current UTC time: ${currentTimeStr}`);

    // Find users who need their daily rep generated at this hour
    // We'll check for times within the current hour (e.g., 12:00-12:59)
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('user_id, email, full_name, preferred_delivery_time, push_token')
      .eq('auto_generate_reps', true)
      .gte('preferred_delivery_time', `${String(currentHour).padStart(2, '0')}:00:00`)
      .lt('preferred_delivery_time', `${String(currentHour + 1).padStart(2, '0')}:00:00`);

    if (usersError) {
      console.error('[AUTO-GENERATE] Error fetching users:', usersError);
      throw usersError;
    }

    console.log(`[AUTO-GENERATE] Found ${users?.length || 0} users for this hour`);

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'No users scheduled for this hour',
        hour: currentHour 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const results = [];
    
    for (const user of users) {
      try {
        console.log(`[AUTO-GENERATE] Processing user ${user.user_id}...`);
        
        // Check if user already has a rep for today
        const today = new Date().toISOString().split('T')[0];
        const { data: existingRep } = await supabase
          .from('daily_rep_assignments')
          .select('id')
          .eq('user_id', user.user_id)
          .eq('assigned_date', today)
          .single();

        if (existingRep) {
          console.log(`[AUTO-GENERATE] User ${user.user_id} already has a rep for today`);
          results.push({ user_id: user.user_id, status: 'skipped', reason: 'already_has_rep' });
          continue;
        }

        // Generate the rep by calling the generate-daily-rep function
        const { data: repData, error: repError } = await supabase.functions.invoke('generate-daily-rep', {
          body: {},
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            'x-user-id': user.user_id  // Pass user ID for the function
          }
        });

        if (repError) {
          console.error(`[AUTO-GENERATE] Error generating rep for user ${user.user_id}:`, repError);
          results.push({ user_id: user.user_id, status: 'error', error: repError.message });
          continue;
        }

        console.log(`[AUTO-GENERATE] Successfully generated rep for user ${user.user_id}`);

        // Send push notification if user has a push token
        if (user.push_token) {
          try {
            await supabase.functions.invoke('send-push-notification', {
              body: {
                token: user.push_token,
                title: "Your Daily Rep is Ready! 🎯",
                body: repData.rep?.title || "Your personalized challenge is waiting",
                data: {
                  rep_id: repData.rep?.id,
                  type: 'daily_rep'
                }
              }
            });
            console.log(`[AUTO-GENERATE] Sent push notification to user ${user.user_id}`);
          } catch (notifError) {
            console.error(`[AUTO-GENERATE] Error sending notification:`, notifError);
          }
        }

        results.push({ user_id: user.user_id, status: 'success' });
      } catch (error) {
        console.error(`[AUTO-GENERATE] Error processing user ${user.user_id}:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({ user_id: user.user_id, status: 'error', error: errorMessage });
      }
    }

    console.log('[AUTO-GENERATE] Completed processing all users');
    
    return new Response(JSON.stringify({ 
      message: 'Auto-generation completed',
      hour: currentHour,
      processed: users.length,
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[AUTO-GENERATE] Fatal error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});