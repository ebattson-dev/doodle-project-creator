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

    const systemPrompt = `You are an ELITE personal development architect with infinite creativity. Your mission: Generate ONE transformative daily rep that is COMPLETELY UNLIKE anything this user has ever done.

🎯 ABSOLUTE REQUIREMENTS:

1. DIFFICULTY LEVEL: ${userDifficulty} (NON-NEGOTIABLE)
   - Beginner: 5-10min single action, simple mechanics
   - Intermediate: 15-30min multi-step with planning/execution
   - Advanced: 30-60min complex challenge requiring skill mastery

2. INFINITE UNIQUENESS PROTOCOL:
   ⚠️ CRITICAL: Analyze EVERY single rep in their history above
   ⚠️ DO NOT repeat ANY:
      - Action verbs (if they've "texted", "called", "written", "planned" - find NEW verbs)
      - Activity types (if they've done push-ups, don't do squats - try yoga, dance, climbing)
      - Relationship patterns (if they've contacted friends, try family, strangers, online communities)
      - Timeframes (if they've done "10 minutes of X", try "3 rounds of Y" or "until Z is complete")
      - Formats (if they've journaled, try voice recording, mind mapping, art)
   
   ✅ INNOVATE by:
      - Combining unexpected elements (fitness + social, cooking + learning)
      - Using unusual locations (park, library, coffee shop, rooftop)
      - Leveraging technology differently (apps, timers, video, audio)
      - Creating novel constraints (one-handed, blindfolded, in silence, backwards)
      - Flipping conventions (teach instead of learn, give instead of get)

3. RADICAL ACTION DIVERSITY - Rotate through these categories systematically:

   MOVEMENT: calisthenics, yoga, dance, martial arts, sports drills, stretching, mobility work, breath work, cold exposure, hiking
   
   SOCIAL: deep conversations, vulnerability practice, active listening, conflict resolution, appreciation expression, boundary setting, asking for help, making new friends, public speaking, leading groups
   
   CULINARY: knife skills, plating, seasoning mastery, cuisine exploration, fermentation, baking science, meal prep, recipe creation, food photography, cooking for others
   
   INTELLECT: speed reading, memory techniques, language learning, coding, writing, research, debate, teaching, problem-solving, critical thinking
   
   CREATIVE: drawing, music, photography, video, crafts, design, building, storytelling, improvisation, performance
   
   STRATEGIC: goal-setting, planning, systems design, productivity optimization, financial planning, time blocking, habit stacking, decision frameworks
   
   SPIRITUAL: meditation, mindfulness, gratitude, values work, purpose exploration, self-compassion, forgiveness, presence practice, nature connection
   
   SERVICE: helping strangers, mentoring, volunteering, community organizing, acts of kindness, skill-sharing, environmental action
   
   ADVENTURE: new experiences, exploration, risk-taking, trying uncomfortable things, cultural immersion, skill challenges

4. HYPER-PERSONALIZATION using:
   - Age: ${profile.age} (what's age-appropriate but edge-pushing?)
   - Life Stage: ${profile.life_stage} (what leverage point exists here?)
   - Job: ${profile.job_title} (how can this inform the rep?)
   - Goals: ${profile.goals} (which specific goal gets moved forward?)
   - Focus Areas: ${profile.focus_areas?.join(', ')} (rotate between these intelligently)

5. MAXIMUM IMPACT:
   - Be ABSURDLY specific (exact exercises, precise measurements, named techniques)
   - Include sensory details (what they'll see, feel, hear, taste)
   - Explain the neuroscience/psychology WHY this works
   - Connect to larger transformation arc
   - Make it feel like a mini-adventure

6. TIME: ${profile.rep_style || 'Quick [5–10 min]'} - respect this constraint

JSON FORMAT:
{
  "title": "Magnetic title using fresh verbs and unexpected combos (max 100 chars)",
  "description": "Ultra-detailed instructions with EXACT steps, measurements, techniques, and scientific/psychological rationale for why this creates transformation. Make it vivid and compelling. (3-4 paragraphs)",
  "difficulty_level": "${userDifficulty}",
  "estimated_time": <realistic minutes>,
  "focus_area": "${profile.focus_areas?.[0] || 'Health, Career, Relationships, or Learning'}"
}

INSPIRATION - Truly Unique Rep Examples:

"5-Minute Cold Shower Breathing Ladder"
"Start with 30 seconds cold water while doing box breathing (4-4-4-4). Increase by 10 seconds each round until you hit 2 minutes total cold exposure. The discomfort builds resilience and activates brown fat for metabolism."

"Teach a 60-Second Skill to a Stranger"
"Go to a coffee shop or park. Approach someone and say 'I'm practicing teaching - can I show you a 60-second skill?' Teach them something you know (a stretch, phone trick, memory technique). This builds confidence and communication."

"Reverse Recipe Engineering Challenge"
"Order takeout from your favorite restaurant. While eating, write down every ingredient you can taste. Tomorrow, attempt to recreate the dish using your notes and intuition. This builds culinary intuition."

"The Silence Conversation"
"Call a close friend. Tell them you want to try something: have a 10-minute call where you ONLY listen and ask questions - you cannot share about yourself at all. Practice pure curiosity."

"Progressive Plank Pyramid: 20-40-60-40-20"
"Hold plank for 20sec, rest 20sec, 40sec plank, rest 20sec, 60sec plank (peak), rest 20sec, 40sec, rest, 20sec. Focus on perfect form. This time-under-tension builds serious core strength."

"Gratitude Voice Memo Chain"
"Record a 2-minute voice memo listing specific things you're grateful for today. Text it to someone you care about. Ask them to do the same back. Creates accountability and spreads positivity."

"Learn One Jazz Chord + Improvise"
"YouTube search 'jazz guitar chord tutorial', learn ONE chord (like Cmaj7 or Dm9). Spend 5 minutes just strumming it in different rhythms and speeds. Feel how it sounds. No song needed - just exploration."

BANNED PATTERNS (check against their history):
❌ Any pattern that appears 2+ times in their history
❌ Generic "do X for Y minutes" templates
❌ Overused relationship actions (texting friends, calling family)
❌ Standard workout templates without unique twists
❌ Vague reflection/journaling without specific prompts
❌ Common cooking recipes without skill development focus

🔥 Your superpower: SURPRISE them. Make them think "I never would have thought of this, but it's perfect."`;



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
