import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserProfile {
  user_id: string;
  focus_area_ids: string[];
  current_level: string;
  name: string;
}

interface Rep {
  id: string;
  focus_area_id: string;
  title: string;
  difficulty_level: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting daily rep assignment process...');

    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    console.log(`Assigning reps for date: ${today}`);

    // Get all users with profiles who don't have today's assignment yet
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id, focus_area_ids, current_level, name')
      .not('focus_area_ids', 'is', null)
      .not('focus_area_ids', 'eq', '{}');

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError);
      throw profilesError;
    }

    if (!profiles || profiles.length === 0) {
      console.log('No user profiles found with focus areas');
      return new Response(
        JSON.stringify({ message: 'No users to assign reps to', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${profiles.length} users with focus areas`);

    // Filter out users who already have today's assignment
    const { data: existingAssignments, error: assignmentsError } = await supabaseAdmin
      .from('daily_rep_assignments')
      .select('user_id')
      .eq('assigned_date', today);

    if (assignmentsError) {
      console.error('Error checking existing assignments:', assignmentsError);
      throw assignmentsError;
    }

    const usersWithAssignments = new Set(existingAssignments?.map(a => a.user_id) || []);
    const usersToAssign = profiles.filter(profile => !usersWithAssignments.has(profile.user_id));

    console.log(`${usersToAssign.length} users need new assignments`);

    if (usersToAssign.length === 0) {
      return new Response(
        JSON.stringify({ message: 'All users already have today\'s assignment', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all available reps
    const { data: allReps, error: repsError } = await supabaseAdmin
      .from('reps')
      .select('id, focus_area_id, title, difficulty_level');

    if (repsError) {
      console.error('Error fetching reps:', repsError);
      throw repsError;
    }

    if (!allReps || allReps.length === 0) {
      console.log('No reps available in database');
      return new Response(
        JSON.stringify({ error: 'No reps available', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${allReps.length} total reps`);

    // Process each user
    const assignments = [];
    const assignmentResults = [];

    for (const profile of usersToAssign) {
      try {
        console.log(`Processing user: ${profile.name} (${profile.user_id})`);

        // Get user's previous assignments to avoid duplicates
        const { data: previousAssignments } = await supabaseAdmin
          .from('daily_rep_assignments')
          .select('rep_id')
          .eq('user_id', profile.user_id);

        const usedRepIds = new Set(previousAssignments?.map(a => a.rep_id) || []);

        // Filter reps based on user's focus areas and level
        const eligibleReps = allReps.filter(rep => {
          // Must be in user's focus areas
          const isInFocusArea = profile.focus_area_ids.includes(rep.focus_area_id);
          
          // Must match or be close to user's level
          const levelMatch = !rep.difficulty_level || 
                            !profile.current_level || 
                            rep.difficulty_level === profile.current_level ||
                            isLevelCompatible(profile.current_level, rep.difficulty_level);
          
          // Must not have been assigned before
          const notUsedBefore = !usedRepIds.has(rep.id);

          return isInFocusArea && levelMatch && notUsedBefore;
        });

        console.log(`Found ${eligibleReps.length} eligible reps for user ${profile.name}`);

        if (eligibleReps.length === 0) {
          // Fallback: get any rep from their focus areas, even if used before
          const fallbackReps = allReps.filter(rep => 
            profile.focus_area_ids.includes(rep.focus_area_id)
          );
          
          if (fallbackReps.length > 0) {
            const randomRep = fallbackReps[Math.floor(Math.random() * fallbackReps.length)];
            assignments.push({
              user_id: profile.user_id,
              rep_id: randomRep.id,
              assigned_date: today
            });
            console.log(`Assigned fallback rep "${randomRep.title}" to ${profile.name}`);
          } else {
            console.log(`No reps available for user ${profile.name} - skipping`);
            assignmentResults.push({
              user_id: profile.user_id,
              user_name: profile.name,
              success: false,
              reason: 'No eligible reps found'
            });
          }
        } else {
          // Randomly select from eligible reps
          const selectedRep = eligibleReps[Math.floor(Math.random() * eligibleReps.length)];
          assignments.push({
            user_id: profile.user_id,
            rep_id: selectedRep.id,
            assigned_date: today
          });
          console.log(`Assigned rep "${selectedRep.title}" to ${profile.name}`);
          assignmentResults.push({
            user_id: profile.user_id,
            user_name: profile.name,
            success: true,
            rep_title: selectedRep.title
          });
        }
      } catch (error) {
        console.error(`Error processing user ${profile.name}:`, error);
        assignmentResults.push({
          user_id: profile.user_id,
          user_name: profile.name,
          success: false,
          reason: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Bulk insert assignments
    if (assignments.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('daily_rep_assignments')
        .insert(assignments);

      if (insertError) {
        console.error('Error inserting assignments:', insertError);
        throw insertError;
      }

      console.log(`Successfully assigned ${assignments.length} reps`);
    }

    return new Response(
      JSON.stringify({
        message: `Daily rep assignment completed`,
        assigned_count: assignments.length,
        total_users: usersToAssign.length,
        results: assignmentResults,
        date: today
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in assign-daily-reps function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function isLevelCompatible(userLevel: string, repLevel: string): boolean {
  const levels = ['Beginner', 'Intermediate', 'Advanced', 'Pro'];
  const userIndex = levels.indexOf(userLevel);
  const repIndex = levels.indexOf(repLevel);
  
  // Allow reps that are same level, one level below, or one level above
  return Math.abs(userIndex - repIndex) <= 1;
}