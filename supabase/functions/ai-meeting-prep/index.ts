import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyName, timeline, activeJobs, placements, pendingTasks } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const prompt = `You are an executive recruitment advisor. Generate a concise one-page meeting prep brief for a recruiter meeting with "${companyName}".

DATA:
- Recent activities: ${JSON.stringify(timeline || [])}
- Active jobs: ${JSON.stringify(activeJobs || [])}
- Total placements: ${placements || 0}
- Pending tasks: ${JSON.stringify(pendingTasks || [])}

Generate the brief in this structure (use the language that matches the company name - Hebrew if Hebrew, English otherwise):

## 📋 Executive Summary
Brief overview of the relationship status.

## 👥 Candidate Status
Summary of all active candidates across roles and their stages.

## ⚠️ Key Bottlenecks
Any hiring process issues or delays.

## 💬 Talking Points
3-5 suggested discussion items for the meeting (e.g., salary adjustments, timeline concerns, new roles).

## ✅ Action Items
Tasks to follow up on after the meeting.

Keep it concise, professional, and actionable. Max 400 words.`;

    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    const aiData = await aiResponse.json();
    const brief = aiData.choices?.[0]?.message?.content || 'Could not generate brief';

    return new Response(JSON.stringify({ brief }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate meeting brief' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
