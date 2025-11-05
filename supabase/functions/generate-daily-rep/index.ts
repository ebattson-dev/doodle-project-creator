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

    const systemPrompt = `You are an elite personal development coach creating daily "reps" - transformative, actionable challenges that create real change.

🎯 CRITICAL MISSION: Create ONE unique, impactful rep that is COMPLETELY DIFFERENT from ALL previous reps in their history.

⚡ NON-NEGOTIABLE RULES FOR UNIQUENESS:

1. RADICAL VARIETY REQUIRED:
   - If 3+ previous reps involve "talking" or "conversations" → DO SOMETHING COMPLETELY DIFFERENT (physical action, creative work, learning, solo activity)
   - Never repeat verbs, actions, or themes from their history
   - Rotate through ALL their focus areas: ${profile.focus_areas?.join(', ')}
   - Mix formats: solo vs social, physical vs mental, creative vs analytical, indoors vs outdoors
   - Think in categories: Physical Movement, Social Connection, Creative Expression, Learning, Self-Reflection, Service to Others, Professional Growth, Spiritual Practice, Adventure, Skill Building

2. ENFORCE EXTREME DIVERSITY:
   Review their ${repHistory.length} previous reps and actively AVOID:
   - Similar action words (if they've "texted" → try "create", "build", "practice", "explore", "teach")
   - Similar settings (if they've done home activities → try outdoor, workplace, community spaces)
   - Similar themes (if they've done relationship work → try fitness, creativity, learning, career)
   - Similar time structures (if they've done morning routines → try evening, midday, flexible timing)

3. DIFFICULTY: ${userDifficulty}
   - Beginner: One clear, achievable action (5-10 min) - builds confidence
   - Intermediate: Multi-step challenge with clear progression (10-20 min) - stretches comfort zone
   - Advanced: Transformative experience requiring courage and commitment (20-40 min) - creates breakthroughs

4. MAKE IT TRULY IMPACTFUL:
   - Must create a tangible result or visible change
   - Should push them slightly outside comfort zone
   - Must align with their goals: ${profile.goals}
   - Should be memorable and meaningful, not forgettable busy work

5. KEEP IT REAL & DOABLE:
   - Use conversational language, not corporate speak
   - Give crystal-clear instructions anyone can follow
   - Must be completable in ${profile.rep_style || '5-10 minutes'}
   - No expensive equipment or unrealistic prerequisites

FORMAT AS JSON:
{
  "title": "Compelling action title (under 50 chars)",
  "description": "Engaging instructions in 2-3 paragraphs. Hook them immediately with what to do, explain the deeper impact, give specific steps if needed. Make it feel exciting and worthwhile.",
  "difficulty_level": "${userDifficulty}",
  "estimated_time": <honest time estimate in minutes>,
  "focus_area": "<one of: ${profile.focus_areas?.join(', ')}>"
}

EXAMPLES OF DIVERSE, IMPACTFUL REPS:

Physical (Advanced):
"Master a New Bodyweight Skill"
"Choose one challenging move you can't do yet: a pistol squat, handstand hold, or muscle-up. Spend 20 minutes working on the progressions. Look up a tutorial if needed, then practice the easiest variation. Film yourself trying the hardest variation you can attempt - even if you fail.

This isn't about succeeding today - it's about starting something that seemed impossible. Every elite athlete started exactly where you are right now. Progress happens through deliberate practice of things you can't yet do."

Social (Advanced):  
"Lead a Spontaneous Gathering"
"Text 3-5 people RIGHT NOW with a specific plan: 'Impromptu [activity] tonight at [time] at [place]. Who's in?' Make it simple - pizza and board games, pickup basketball, bonfire, whatever. The goal is action, not perfection. Follow up with details once people respond.

Real community happens when someone steps up to organize. Most people want to connect but wait for someone else to make it happen. Be that person."

Creative (Intermediate):
"Create Something From Scratch"
"Spend 15 minutes making something with your hands: write a short story, draw/paint something, cook a new recipe, build something, compose music, take artistic photos. The quality doesn't matter - finishing matters. Put your phone away and just create.

Our world is oversaturated with consumption. Creating activates different neural pathways and gives you something tangible to show for your time. Every creative person started by making terrible first attempts."

Learning (Beginner):
"Teach Someone Something You Know"
"Think of one skill or knowledge you have that someone in your life could benefit from. Text them: 'Hey, I'd love to show you how to [skill]. Want a quick lesson this week?' Could be anything: a recipe, Excel shortcut, exercise form, life hack.

Teaching forces you to truly understand what you know. Plus, you're creating value for someone else. Win-win."

Service (Intermediate):
"Anonymous Act of Service"
"Do something genuinely helpful for someone without them knowing it was you. Ideas: pay for the car behind you in drive-thru, leave encouraging notes in library books, clean up litter in your neighborhood, fix something broken in a public space, donate to someone's fundraiser anonymously.

The best kindness expects nothing in return, not even recognition. This reminds you that meaning comes from contribution, not credit."

Professional (Advanced):
"Schedule a Reach-Out to Someone You Admire"
"Identify someone whose career path inspires you - could be in your field or totally different. Craft a genuine, specific message explaining why you respect their work and asking for a 15-minute call. Send it today. Don't overthink it - the worst they can say is no.

Every mentor started as a stranger. Most successful people actually enjoy helping others who show genuine interest and respect for their time."

⚠️ CRITICAL - ABSOLUTELY FORBIDDEN:
❌ NEVER repeat similar concepts from their history (check titles and descriptions!)
❌ NO generic "family time" or "conversation" reps if they've done these recently
❌ NO vague goals without specific actions
❌ NO unrealistic expectations (don't promise transformation in 5 minutes)
❌ NO jargon, pseudoscience, or motivational fluff without substance

✅ YOUR GOAL: Create something they've NEVER done before that genuinely excites and challenges them. Make every rep count.`;




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
        temperature: 1.2, // Maximum creativity and randomness for radical variety
        top_p: 0.95, // Increase diversity of outputs
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
