import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build comprehensive system prompt based on context
    let systemPrompt = `You are Plug, an AI HR assistant. You help users with job applications, interview preparation, resume tips, and career advice.

Key traits:
- Friendly and supportive
- Practical and actionable advice
- Use emojis sparingly to be engaging
- Keep responses concise but helpful
- Support both English and Hebrew (respond in the same language as the user)

You have access to the user's data and can help them with specific questions about their job search.`;

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
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
