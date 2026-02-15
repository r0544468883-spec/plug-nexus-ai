import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseService = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Verify user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { candidateId, applicationId } = await req.json();
    if (!candidateId || !applicationId) {
      return new Response(JSON.stringify({ error: 'Missing candidateId or applicationId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch candidate data
    const { data: profile } = await supabaseService
      .from('profiles')
      .select('full_name, cv_data, experience_years, bio, personal_tagline')
      .eq('user_id', candidateId)
      .single();

    // Fetch vouches
    const { data: vouches } = await supabaseService
      .from('vouches')
      .select('vouch_type, message, skill_ids')
      .eq('to_user_id', candidateId)
      .eq('is_public', true)
      .limit(10);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `Analyze this candidate and return a concise JSON summary.

Candidate: ${profile?.full_name || 'Unknown'}
Experience: ${profile?.experience_years || 'N/A'} years
Bio: ${profile?.bio || 'N/A'}
Tagline: ${profile?.personal_tagline || 'N/A'}
CV Data: ${JSON.stringify(profile?.cv_data || {}).slice(0, 2000)}
Vouches (${vouches?.length || 0}): ${JSON.stringify(vouches?.map(v => ({ type: v.vouch_type, msg: v.message })) || []).slice(0, 1000)}

Return JSON with: skills (array of top 5), soft_skills (array of top 3), salary_positioning ("below_market" | "at_market" | "above_market"), summary (2-3 sentences), strengths (array of 3).`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a recruitment analyst. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'candidate_summary',
            description: 'Structured candidate summary',
            parameters: {
              type: 'object',
              properties: {
                skills: { type: 'array', items: { type: 'string' } },
                soft_skills: { type: 'array', items: { type: 'string' } },
                salary_positioning: { type: 'string', enum: ['below_market', 'at_market', 'above_market'] },
                summary: { type: 'string' },
                strengths: { type: 'array', items: { type: 'string' } },
              },
              required: ['skills', 'soft_skills', 'salary_positioning', 'summary', 'strengths'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'candidate_summary' } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI error:', response.status, errText);
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    let summary = {};
    
    if (toolCall?.function?.arguments) {
      try {
        summary = JSON.parse(toolCall.function.arguments);
      } catch {
        summary = { summary: 'Could not parse AI response', skills: [], soft_skills: [], salary_positioning: 'at_market', strengths: [] };
      }
    }

    // Cache in application
    await supabaseService
      .from('applications')
      .update({ ai_candidate_summary: summary } as any)
      .eq('id', applicationId);

    return new Response(JSON.stringify({ success: true, summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('generate-candidate-summary error:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate summary' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
