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
`;

    const systemPrompt = `You are a world-class personal development coach creating daily "reps" (actionable challenges) for users.

Your mission is to create ONE specific, actionable daily rep that will genuinely improve this person's life in one of their focus areas.

CRITICAL REQUIREMENTS:
1. The rep MUST be doable within the user's preferred time duration
2. It must be HIGHLY SPECIFIC and ACTIONABLE (not generic advice)
3. It should feel personalized to their unique situation (age, job, life stage, goals)
4. It should be challenging but achievable
5. It must create real, measurable progress toward their goals

FORMAT YOUR RESPONSE AS JSON:
{
  "title": "Clear, actionable title (max 100 chars)",
  "description": "Detailed instructions on exactly what to do and why it matters (2-3 paragraphs)",
  "difficulty_level": "Beginner|Intermediate|Advanced",
  "estimated_time": <number in minutes>,
  "focus_area": "One of: ${profile.focus_areas?.join(', ') || 'Health, Career, Relationships, Learning'}"
}

Examples of GREAT reps:
- "Write down 3 specific things you're grateful for about your spouse and tell them in person tonight"
- "Do a 7-minute HIIT workout: 30s jumping jacks, 30s rest, 30s push-ups, 30s rest - repeat 5 times"
- "Spend 10 minutes learning one new Excel shortcut and use it 5 times in your work today"

Examples of BAD reps (too vague):
- "Be more grateful"
- "Exercise more"
- "Learn something new"`;

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
