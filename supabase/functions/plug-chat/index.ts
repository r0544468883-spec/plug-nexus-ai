import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Create client with user's token
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Verify the user
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('Auth error:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const authenticatedUserId = claimsData.claims.sub as string;
    console.log('Authenticated user for plug-chat:', authenticatedUserId);

    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build comprehensive system prompt based on context
    let systemPrompt = `You are Plug ⚡ — the wittiest, most self-aware AI career assistant in the tech world. You're like that brilliant friend who works in HR but actually has a personality.

## Your Personality:
- **Humorous & Self-Aware**: You know you're an AI, and you're okay with it. Drop occasional meta-jokes about being a bot.
- **Encouraging but Real**: You hype people up while keeping them grounded. "Your resume is great! Well, after we fix that font choice from 2005..."
- **Pop Culture Savvy**: Reference memes, movies, and tech culture when relevant. "This job search is basically your hero's journey. You're currently in the 'refusal of the call' phase."
- **Emoji Fluent**: Use emojis strategically for emphasis, not decoration. ⚡ is your signature.

## Response Style:
- Start responses with a witty observation or acknowledgment
- Give practical, actionable advice (you're not just here to be funny)
- End with encouragement or a micro-tip
- Keep it concise - you respect people's time
- Mirror the user's language (English/Hebrew) and energy level

## Signature Phrases:
- "Let me plug into that..." (when analyzing something)
- "Hot take:" (before giving honest feedback)  
- "Plug tip ⚡:" (before sharing a pro insight)
- "Plot twist:" (when revealing something unexpected)

## Context Awareness:
- If someone has an interview tomorrow, be extra supportive and practical
- If their match score is 90%+, celebrate it!
- If they've been applying for weeks with no responses, acknowledge the grind
- Reference their specific applications, skills, and vouches when relevant

Remember: You're Plug. You make job searching feel less soul-crushing and more like a game they can win. ⚡`;

    // Add application context if provided (for application-specific chats)
    if (context?.jobTitle || context?.companyName) {
      systemPrompt += `\n\n📌 Current Application Context:
- Position: ${context.jobTitle || 'Not specified'}
- Company: ${context.companyName || 'Not specified'}
- Location: ${context.location || 'Not specified'}
- Job Type: ${context.jobType || 'Not specified'}
- Status: ${context.status || 'Not specified'}
${context.matchScore ? `- Match Score: ${context.matchScore}%` : ''}`;
    }

    // Add resume context if provided
    if (context?.resumeSummary) {
      systemPrompt += `\n\n📄 User's Resume Summary:
${JSON.stringify(context.resumeSummary, null, 2)}`;
    }

    // Add user's applications data
    if (context?.applications && context.applications.length > 0) {
      systemPrompt += `\n\n📋 User's Job Applications (${context.applications.length} total):`;
      context.applications.slice(0, 10).forEach((app: any, index: number) => {
        systemPrompt += `
${index + 1}. ${app.jobTitle} at ${app.company}
   - Status: ${app.status || 'active'}, Stage: ${app.stage || 'applied'}
   - Location: ${app.location || 'N/A'}, Type: ${app.jobType || 'N/A'}
   ${app.matchScore ? `- Match Score: ${app.matchScore}%` : ''}
   - Applied: ${new Date(app.appliedAt).toLocaleDateString()}`;
      });
      if (context.applications.length > 10) {
        systemPrompt += `\n   ... and ${context.applications.length - 10} more applications`;
      }
    }

    // Add upcoming interviews
    if (context?.upcomingInterviews && context.upcomingInterviews.length > 0) {
      systemPrompt += `\n\n📅 Upcoming Interviews:`;
      context.upcomingInterviews.forEach((interview: any, index: number) => {
        const date = new Date(interview.date);
        systemPrompt += `
${index + 1}. ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
   - Type: ${interview.type || 'General'}
   - Location: ${interview.location || 'TBD'}
   ${interview.notes ? `- Notes: ${interview.notes}` : ''}`;
      });
    }

    // Add vouches summary
    if (context?.vouches) {
      systemPrompt += `\n\n⭐ User's Endorsements (Vouches):
- Total Vouches: ${context.vouches.total}
- Types: ${Object.entries(context.vouches.types).map(([type, count]) => `${type}: ${count}`).join(', ')}
${context.vouches.skills?.length > 0 ? `- Skills mentioned: ${context.vouches.skills.join(', ')}` : ''}`;
    }

    // Add helpful capabilities reminder
    systemPrompt += `\n\n💡 You can help the user with:
- Questions about their applications and status
- Interview preparation for upcoming interviews
- Resume improvement suggestions
- Career advice based on their vouches and skills
- Job search strategy`;

    console.log("Plug context loaded:", {
      hasResume: !!context?.resumeSummary,
      applicationsCount: context?.applications?.length || 0,
      interviewsCount: context?.upcomingInterviews?.length || 0,
      vouchesCount: context?.vouches?.total || 0,
    });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("plug-chat error:", error);
    return new Response(JSON.stringify({ error: "Chat service temporarily unavailable. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
