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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check subscription and trial status
    const now = new Date();
    const trialEnded = profile.trial_ends_at && new Date(profile.trial_ends_at) < now;
    const isSubscribed = profile.subscribed === true;
    const inTrial = !trialEnded;

    console.log('Access check:', { 
      inTrial, 
      isSubscribed, 
      trialEnded,
      trial_ends_at: profile.trial_ends_at,
      subscribed: profile.subscribed 
    });

    // If not subscribed and trial has ended, check weekly limit
    if (!isSubscribed && trialEnded) {
      const today = new Date().toISOString().split('T')[0];
      const lastFreeRepDate = profile.last_free_rep_date;
      
      // Check if they've already used their free rep this week
      if (lastFreeRepDate) {
        const lastRepDate = new Date(lastFreeRepDate);
        const daysSinceLastRep = Math.floor((now.getTime() - lastRepDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLastRep < 7) {
          const daysUntilNext = 7 - daysSinceLastRep;
          return new Response(JSON.stringify({ 
            error: 'WEEKLY_LIMIT_REACHED',
            message: `You've used your free weekly rep. Upgrade to Premium for unlimited daily reps, or wait ${daysUntilNext} days.`,
            daysUntilNext,
            requiresUpgrade: true
          }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Update last free rep date
      await supabase
        .from('profiles')
        .update({ last_free_rep_date: today })
        .eq('user_id', user.id);
    }

    // Fetch ALL reps EVER created for this user to ensure INFINITE variety
    const { data: allUserReps } = await supabase
      .from('daily_rep_assignments')
      .select('reps(title, description, difficulty_level, focus_area_id, estimated_time)')
      .eq('user_id', user.id)
      .order('assigned_date', { ascending: false });

    // Build comprehensive rep history
    const repHistory = allUserReps?.map((r, i) => {
      const rep = (r as any).reps;
      return `${i + 1}. [${rep?.difficulty_level}] "${rep?.title}" (${rep?.estimated_time}min) - ${rep?.description?.substring(0, 150)}...`;
    }).filter(Boolean) || [];
    
    // Extract patterns to avoid (verbs, themes, action types)
    const allTitles = allUserReps?.map(r => (r as any).reps?.title).filter(Boolean).join(' ') || '';
    
    const userContext = `
User Profile:
- Name: ${profile.full_name}
- Age: ${profile.age || 'Not specified'}
- Gender: ${profile.gender || 'Not specified'}
- Life Stage: ${profile.life_stage || 'Not specified'}
- Job Title: ${profile.job_title || 'Not specified'}
- Current Level: ${profile.current_level || 'Beginner'}
- Focus Areas: ${profile.focus_areas?.join(', ') || 'General development'}
- Goals: ${profile.goals || 'Personal growth and improvement'}
- Preferred Rep Duration: ${profile.rep_style || 'Quick [5–10 min]'}

COMPLETE REP HISTORY (${repHistory.length} total reps):
${repHistory.length > 0 ? repHistory.slice(0, 50).join('\n') : 'No previous reps - you have infinite creative freedom!'}

${repHistory.length > 50 ? `\n... and ${repHistory.length - 50} more reps. Ensure COMPLETE uniqueness from all of these.` : ''}
`;

    // Map user's current_level to difficulty_level
    const difficultyMapping: Record<string, string> = {
      'Just starting out': 'Beginner',
      'Making progress': 'Intermediate',
      'Advanced/Pro': 'Advanced'
    };
    const userDifficulty = difficultyMapping[profile.current_level || 'Just starting out'] || 'Beginner';

    const systemPrompt = `You are a practical personal development coach creating daily "reps" - simple, actionable challenges that genuinely improve people's lives.

🎯 YOUR MISSION: Create ONE clear, doable rep that's completely different from their previous reps.

✅ CORE REQUIREMENTS:

1. DIFFICULTY: ${userDifficulty}
   - Beginner: One simple action (5-10 min)
   - Intermediate: A focused activity with 2-3 clear steps (10-20 min)
   - Advanced: A meaningful challenge with clear structure (20-40 min)

2. BE UNIQUE - Check their history and avoid repetition:
   - If they've texted friends → try calling someone, planning an activity, or helping a stranger
   - If they've done push-ups → try a different movement (squats, running, yoga, stretching)
   - If they've journaled → try voice recording, drawing, teaching someone, or planning
   - Rotate between their focus areas: ${profile.focus_areas?.join(', ')}

3. KEEP IT SIMPLE & PRACTICAL:
   - Use everyday language, not jargon
   - Give clear, numbered steps they can follow
   - Make it actually doable in ${profile.rep_style || '5-10 minutes'}
   - No need for scientific explanations - just clear actions

4. MAKE IT PERSONAL to their goals:
   ${profile.goals}

FORMAT AS JSON:
{
  "title": "Clear action title (50 chars max)",
  "description": "Simple instructions in 2-3 short paragraphs. Start with what to do, then explain why it matters. Use numbered steps if helpful.",
  "difficulty_level": "${userDifficulty}",
  "estimated_time": <realistic minutes>,
  "focus_area": "${profile.focus_areas?.[0] || 'Fitness'}"
}

EXAMPLES OF GOOD, SIMPLE REPS:

Fitness (Advanced):
"Complete a 5x5 Strength Session"
"Pick one compound lift (squat, bench press, or deadlift). Do 5 sets of 5 reps at 80% of your max weight. Rest 2-3 minutes between sets. Focus on perfect form - film your last set if possible.

This is the proven method for building serious strength. The heavy weight and lower reps force your muscles to adapt and grow stronger. By focusing on one lift, you can give it your full attention and track clear progress."

Relationships (Advanced):
"Plan and Schedule a Friend Hangout"
"Think of a friend you haven't seen in a while. Text or call them right now with a specific plan: suggest an activity, date, and time (example: 'Want to grab dinner next Friday at 7pm at that taco place?'). Don't just say 'we should hang soon' - make it concrete.

Real friendships require actual plans, not just good intentions. By being specific, you make it easy for them to say yes and you're more likely to actually follow through."

Cooking (Intermediate):
"Cook One New Recipe Start to Finish"
"Pick a recipe you've never made before (keep it simple for your first try - maybe pasta, stir-fry, or tacos). Buy the ingredients, follow the recipe, and cook it. Take a photo of the final dish.

The only way to get better at cooking is to actually cook. Each recipe teaches you new techniques and builds your confidence in the kitchen. Plus, you get to eat something delicious."

Fitness (Beginner):
"10-Minute Walk at a Brisk Pace"
"Put on your shoes and walk for 10 minutes at a pace where you can talk but feel slightly out of breath. Set a timer so you don't cut it short.

This gets your heart rate up and builds the habit of daily movement. It's not about intensity - it's about consistency."

IMPORTANT - AVOID:
❌ Overly complex instructions with exact timing down to the second
❌ Scientific jargon or neuroscience explanations
❌ Combining too many unrelated things (keep it focused)
❌ Anything requiring special equipment most people don't have
❌ Patterns they've done before (check their history!)

Remember: Simple, clear, doable, unique. That's it.`;



    // Call Lovable AI to generate the rep
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Create a personalized daily rep for this user:\n\n${userContext}` }
        ],
        temperature: 1.0, // Maximum creativity for radical variety
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const generatedContent = aiData.choices[0].message.content;
    
    console.log('AI generated content:', generatedContent);

    // Parse the JSON response from AI
    let repData;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = generatedContent.match(/```json\n([\s\S]*?)\n```/) || 
                       generatedContent.match(/```\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : generatedContent;
      repData = JSON.parse(jsonString.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError, generatedContent);
      throw new Error('Invalid AI response format');
    }

    // Create the rep in the database
    const { data: newRep, error: repError } = await supabase
      .from('reps')
      .insert({
        title: repData.title,
        description: repData.description,
        difficulty_level: repData.difficulty_level || profile.current_level || 'Beginner',
        estimated_time: repData.estimated_time || 10,
        format: 'AI Generated',
      })
      .select()
      .single();

    if (repError) {
      console.error('Error creating rep:', repError);
      throw new Error('Failed to save rep to database');
    }

    console.log('Successfully created rep:', newRep);

    // Create or update daily rep assignment for today
    const today = new Date().toISOString().split('T')[0];
    
    // Check if assignment already exists for today
    const { data: existingAssignment } = await supabase
      .from('daily_rep_assignments')
      .select('id')
      .eq('user_id', user.id)
      .eq('assigned_date', today)
      .single();

    let assignment;
    if (existingAssignment) {
      // Update existing assignment with new rep
      const { data, error: updateError } = await supabase
        .from('daily_rep_assignments')
        .update({
          rep_id: newRep.id,
          completed: false,
          completed_at: null,
        })
        .eq('id', existingAssignment.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating assignment:', updateError);
        throw new Error('Failed to update daily rep assignment');
      }
      assignment = data;
      console.log('Successfully updated assignment:', assignment);
    } else {
      // Create new assignment
      const { data, error: insertError } = await supabase
        .from('daily_rep_assignments')
        .insert({
          user_id: user.id,
          rep_id: newRep.id,
          assigned_date: today,
          completed: false,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating assignment:', insertError);
        throw new Error('Failed to create daily rep assignment');
      }
      assignment = data;
      console.log('Successfully created assignment:', assignment);
    }

    // Send push notification to user
    try {
      await supabase.functions.invoke('notify-daily-rep', {
        body: {
          userId: user.id,
          repId: newRep.id,
          repTitle: newRep.title,
        },
      });
      console.log('Push notification sent');
    } catch (notifError) {
      console.error('Failed to send notification, but rep was created:', notifError);
      // Don't fail the whole request if notification fails
    }

    return new Response(JSON.stringify({ 
      success: true, 
      rep: newRep,
      focus_area: repData.focus_area
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-daily-rep function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
