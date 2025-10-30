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

    // Fetch recent reps to avoid ANY repetition (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: recentReps } = await supabase
      .from('daily_rep_assignments')
      .select('reps(title, description, focus_area_id)')
      .eq('user_id', user.id)
      .gte('assigned_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('assigned_date', { ascending: false });

    const recentRepDetails = recentReps?.map(r => {
      const rep = (r as any).reps;
      return `"${rep?.title}" - ${rep?.description?.substring(0, 100)}...`;
    }).filter(Boolean) || [];
    
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

Recent Reps from Last 30 Days (YOU MUST CREATE SOMETHING COMPLETELY DIFFERENT):
${recentRepDetails.length > 0 ? recentRepDetails.slice(0, 20).map((t, i) => `${i + 1}. ${t}`).join('\n') : '- None yet (be creative!)'}
`;

    // Map user's current_level to difficulty_level
    const difficultyMapping: Record<string, string> = {
      'Just starting out': 'Beginner',
      'Making progress': 'Intermediate',
      'Advanced/Pro': 'Advanced'
    };
    const userDifficulty = difficultyMapping[profile.current_level || 'Just starting out'] || 'Beginner';

    const systemPrompt = `You are an elite personal development coach creating transformative daily "reps" (actionable challenges).

MISSION: Create ONE completely unique, high-impact rep that has NEVER been done before by this user.

ABSOLUTE REQUIREMENTS:

1. DIFFICULTY LEVEL - MUST BE: ${userDifficulty}
   - Beginner: Simple first steps (5-10 min, single action)
   - Intermediate: Multi-step or sustained effort (15-30 min, requires planning/execution)
   - Advanced: Complex challenges requiring skill/commitment (30+ min, comprehensive)

2. RADICAL DIVERSITY - THIS IS CRITICAL:
   - Scan ALL recent reps above - DO NOT repeat ANY pattern, theme, or approach
   - Never default to obvious patterns ("text friends", "journal for X minutes", etc.)
   - Think laterally and creatively - what would genuinely surprise and challenge them?
   - Rotate through completely different action categories:
   
   PHYSICAL: workouts, sports, mobility, breathing, posture, challenges, outdoor activities
   SOCIAL: conversations (in-person/calls, not texts), events, vulnerability, reconnecting, new connections, group activities
   CREATIVE: cooking, baking, art, music, writing, building, photography, design
   LEARNING: skills, languages, tutorials, reading, teaching others, online courses
   REFLECTION: journaling, meditation, goal-setting, values clarification, gratitude (but be specific!)
   PLANNING: organizing, scheduling, systems, meal prep, habit design
   CONTRIBUTION: helping others, volunteering, mentoring, community
   ADVENTURE: trying new places, experiences, foods, activities
   PROFESSIONAL: networking, skill development, side projects, leadership
   
3. PERSONALIZATION - Use their profile deeply:
   - Consider their age (${profile.age}), life stage (${profile.life_stage}), job (${profile.job_title})
   - Goals: ${profile.goals}
   - Make it feel like it was designed specifically for THEM

4. IMPACT & SPECIFICITY:
   - Be extremely concrete (exact reps, sets, times, steps, locations)
   - Explain WHY this matters and HOW it builds toward their goals
   - Make it meaningful, not just "busy work"
   - Should feel challenging but achievable at their level

5. TIME CONSTRAINT: ${profile.rep_style || 'Quick [5–10 min]'}

FORMAT AS JSON:
{
  "title": "Compelling, specific title (max 100 chars) - NO clichés",
  "description": "Crystal clear instructions with exact steps + why this creates transformation (2-3 rich paragraphs with specific details, measurements, techniques)",
  "difficulty_level": "${userDifficulty}",
  "estimated_time": <realistic minutes>,
  "focus_area": "Primary area: ${profile.focus_areas?.join(' OR ') || 'Health, Career, Relationships, Learning'}"
}

EXAMPLES OF TRULY DIVERSE REPS:

GYM (Advanced):
"Progressive Overload Session: Add 5lbs to Your Weakest Lift"
"Complete your normal gym routine, but identify your weakest compound movement (squat/bench/deadlift/overhead press). Add exactly 5 pounds to the bar and complete 3 sets of 5 reps with perfect form. Film the last set to review your technique. This progressive overload is how strength is built."

RELATIONSHIPS (Advanced):
"Host a 'No Phones' Dinner Challenge"
"Invite 2-3 friends over tonight or this week. Everyone puts phones in a basket at the door. Cook together (doesn't need to be fancy - pasta works!), and have genuine conversations. Ask each person: 'What's one thing you're struggling with right now?' Create real connection."

COOKING (Beginner):
"Master One Knife Skill: The Proper Dice"
"Watch a 5-minute YouTube video on proper dicing technique. Then practice on 2 onions and 2 tomatoes. Focus on the claw grip and consistent cube sizes. Take a photo of your best work. This foundational skill makes all cooking faster."

COOKING (Advanced):
"Reverse-Engineer a Restaurant Dish"
"Think of your favorite restaurant dish. Research the technique online, buy ingredients, and attempt to recreate it from scratch without following a recipe exactly. Taste as you go, adjust seasonings, plate beautifully. This builds intuition."

FITNESS (Intermediate):
"Tempo Squat Challenge: 5-3-1 Method"
"Do 4 sets of 8 bodyweight or weighted squats using tempo: 5 seconds down, 3 second pause at bottom, 1 second explosive up. Rest 90 seconds between sets. This time-under-tension builds serious strength and control."

RELATIONSHIPS (Beginner):
"Compliment Ambush: 3 People, 3 Genuine Compliments"
"Today, give three different people (coworker, friend, family) one genuine, specific compliment about something beyond appearance ('I really respect how you handled that situation', 'Your enthusiasm is contagious'). Notice their reaction."

LEARNING (Advanced):
"Teach What You're Learning: 10-Minute Presentation"
"Pick one thing you've been learning about (fitness, cooking, work skill). Create a rough 10-minute presentation explaining it to a friend or record yourself. Teaching forces deep understanding and reveals gaps in your knowledge."

AVOID THESE TIRED PATTERNS:
❌ "Text X friends about Y"
❌ "Write in journal for X minutes"
❌ "Do generic workout for X minutes"
❌ "Think about/reflect on X"
❌ "Read about X for Y minutes"
❌ Any rep similar to what they've done recently

Remember: Your goal is to create GENUINE transformation through SURPRISING, SPECIFIC, HIGH-IMPACT actions they've never tried before.`;



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
