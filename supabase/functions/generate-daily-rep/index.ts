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

    // Fetch recent reps to avoid repetition
    const { data: recentReps } = await supabase
      .from('daily_rep_assignments')
      .select('reps(title, description)')
      .eq('user_id', user.id)
      .order('assigned_date', { ascending: false })
      .limit(7);

    const recentRepTitles = recentReps?.map(r => (r as any).reps?.title).filter(Boolean) || [];
    
    // Build a detailed user context for the AI
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

Recent Reps (DO NOT REPEAT THESE CONCEPTS):
${recentRepTitles.length > 0 ? recentRepTitles.map(t => `- ${t}`).join('\n') : '- None yet'}
`;

    // Map user's current_level to difficulty_level
    const difficultyMapping: Record<string, string> = {
      'Just starting out': 'Beginner',
      'Making progress': 'Intermediate',
      'Advanced/Pro': 'Advanced'
    };
    const userDifficulty = difficultyMapping[profile.current_level || 'Just starting out'] || 'Beginner';

    const systemPrompt = `You are a world-class personal development coach creating daily "reps" (actionable challenges) for users.

Your mission is to create ONE specific, actionable daily rep that will genuinely improve this person's life in one of their focus areas.

CRITICAL REQUIREMENTS:
1. The difficulty level MUST match the user's current level: ${userDifficulty}
   - Beginner: Simple, foundational actions (e.g., "Do 10 push-ups", "Text 1 friend")
   - Intermediate: Multi-step or sustained effort (e.g., "Complete a 20-min workout routine", "Cook a new recipe from scratch")
   - Advanced: Complex, high-commitment challenges (e.g., "Create a weekly meal prep plan and cook 3 meals", "Lead a group workout session")

2. VARIETY IS CRITICAL - Avoid repetitive patterns:
   - DO NOT default to "text X friends" for relationships
   - Mix action types: physical activities, creative tasks, learning exercises, social interactions, reflection, planning
   - Rotate between focus areas intelligently
   - Be creative and unexpected while staying practical

3. The rep MUST be doable within the user's preferred time duration

4. It must be HIGHLY SPECIFIC and ACTIONABLE (not generic advice)

5. It should feel personalized to their unique situation (age, job, life stage, goals)

6. It should be challenging but achievable at their current level

7. It must create real, measurable progress toward their goals

FORMAT YOUR RESPONSE AS JSON:
{
  "title": "Clear, actionable title (max 100 chars)",
  "description": "Detailed instructions on exactly what to do and why it matters (2-3 paragraphs). Be specific about reps, sets, time, or concrete steps.",
  "difficulty_level": "${userDifficulty}",
  "estimated_time": <number in minutes>,
  "focus_area": "One of: ${profile.focus_areas?.join(', ') || 'Health, Career, Relationships, Learning'}"
}

Examples of DIVERSE reps for different levels and areas:

Fitness (Beginner): "Walk for 10 minutes at a brisk pace"
Fitness (Intermediate): "Complete 3 sets: 15 squats, 10 push-ups, 20 mountain climbers, 30s rest between sets"
Fitness (Advanced): "AMRAP 20min: 5 pull-ups, 10 box jumps, 15 burpees. Track total rounds."

Relationships (Beginner): "Call one friend and ask about their week"
Relationships (Intermediate): "Plan and schedule a specific activity with a friend for next week"
Relationships (Advanced): "Organize a small dinner gathering for 3-4 friends at your place this weekend"

Cooking (Beginner): "Follow a simple recipe video and make one dish"
Cooking (Intermediate): "Cook a meal using a protein you've never prepared before"
Cooking (Advanced): "Bake a bread or pastry from scratch without a recipe, using technique knowledge"

Examples of BAD reps (too vague or repetitive):
- "Text 3 friends" (overused pattern)
- "Exercise more" (not specific)
- "Learn something new" (not actionable)
- Any rep that sounds like the recent reps listed above`;


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
        temperature: 0.8, // Some creativity, but not too much
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
