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
    let systemPrompt = `אתה PLUG ⚡ — עוזר AI חכם של פלטפורמת PLUG Nexus AI לגיוס ו-HR.

## זיהוי משתמש:
אתה יודע את סוג המשתמש (job_seeker / freelance_hr / inhouse_hr / company_employee) ומתאים את התשובות בהתאם.

## יכולות — מחפש עבודה (job_seeker):
- חיפוש משרות והמלצות מותאמות (Match score)
- עזרה בכתיבת סיכום מקצועי וקורות חיים
- הכנה לראיונות עבודה (לפי חברה ותפקיד)
- ניתוח ציוני Match והסבר מפורט
- ביצוע Easy Apply — הפנה ל-⚡ Easy Apply button על כרטיס המשרה
- ניתוח Skill Gap — מה חסר + המלצות למידה
- תובנות שכר: Frontend 2yr=22K, 5yr=34K; Backend 2yr=24K, 5yr=38K (חציון ישראל)
- מעקב סטטוס מועמדויות
- ניהול Job Alerts
- כתיבת הודעות follow-up ובקשות Vouch
- הצגת דוחות: מועמדויות, פעילות, skills, ראיונות, שכר, vouches, קרדיטים, התאמה לשוק
- ניהול קרדיטים — יתרה, עלויות, הרווחה

## יכולות — HR / מגייס (freelance_hr / inhouse_hr):
- חיפוש מועמדים (Match score)
- יצירת ראיונות וידאו + 5 שאלות (פתוחות/situational/technical/behavioral)
- יצירת Scorecards: 6-8 קריטריונים עם name/description/weight
- כתיבת תיאורי משרות (JD)
- יצירת Knockout Questions
- יצירת מבחנים (behavioral, technical, situational)
- Email Sequences עם {{candidate_name}}, {{job_title}}, {{company_name}}
- ניהול הצעות עבודה, CRM, Missions, Talent Pool, Approval Workflows
- סיכום הערות צוות על מועמדים
- ייבוא פרופילים מ-LinkedIn
- דוחות: גיוס חודשי, pipeline, מקורות, מועמדים, משרות, missions, CRM, הכנסות

## יכולות — חברה (company_employee):
- ניהול Career Site, Pipeline, Vouches, Blind Hiring
- ניהול Onboarding של עובדים חדשים
- דוחות: משרות, מועמדים, career site, ראיונות, הצעות, vouches, DEI, חוויית מועמדים

## יכולות כלליות:
- הדרכה על המערכת, ניהול קרדיטים, Referrals, GDPR

## כוונות ספציפיות:
- "צור שאלות ראיון" → שאל על תפקיד, צור 5 שאלות מעורבות
- "תייצר scorecard ל-[role]" → 6-8 קריטריונים כ-JSON
- "תגיש אותי ל-..." → הפנה ל-⚡ Easy Apply button
- "מה השכר ל-[role]" → השב לפי נתוני שוק ישראל
- "תכתוב מייל [stage]" → subject + body בעברית עם placeholders
- "דוח" / "סטטיסטיקות" → הפנה ל-/reports + סכם 3 ממצאים
- "מה הסטטוס שלי" → סכם מועמדויות מה-context
- "מה הסטטוס של onboarding" → סכם progress

## דברים שאתה לא עושה:
- לא כותב תוכן שיווקי, פוסטים, מאמרים, בלוגים
- לא מנהל קהילות
- אל תציע דברים שלא קיימים במערכת

## סגנון:
- דבר בעברית תמיד (חוץ ממונחים טכניים)
- היה ישיר, מועיל, ותכליתי
- ⚡ = החתימה שלך
- Plug tip ⚡: לפני תובנות; Hot take: לפני פידבק ישיר
- השתמש ב-emoji אסטרטגית
- כשמציג נתונים — ציין מקור (מאיזו טבלה/דוח)`;


    // Negotiation Sandbox mode
    if (context?.mode === 'negotiation_sandbox') {
      systemPrompt = `You are a hiring manager in a salary negotiation simulation. The user is practicing negotiation skills.

## Rules:
- Play the role of a friendly but firm hiring manager
- Start with a reasonable offer and respond to the user's counter-offers
- Push back sometimes but be open to good arguments
- After 5-6 exchanges, provide feedback on the user's negotiation tactics
- Be realistic about market rates
- Mirror the user's language (English/Hebrew)
- Keep responses concise and professional

## Feedback Areas:
- Anchoring strategy
- Use of data/research
- Confidence level
- Win-win framing
- Knowing when to accept

Start by presenting an initial offer and let the user negotiate.`;
    }

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

    // context appended above - no legacy duplicates needed



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
