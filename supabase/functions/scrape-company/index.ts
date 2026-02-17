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
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Validate URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http')) formattedUrl = `https://${formattedUrl}`;
    try { new URL(formattedUrl); } catch { return new Response(JSON.stringify({ error: 'Invalid URL' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    // Try Firecrawl first
    let pageContent = '';
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    
    if (FIRECRAWL_API_KEY) {
      try {
        const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${FIRECRAWL_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: formattedUrl, formats: ['markdown'], onlyMainContent: true, waitFor: 3000 }),
        });
        const data = await res.json();
        if (res.ok && data.success && data.data?.markdown) {
          pageContent = data.data.markdown.substring(0, 30000);
        }
      } catch (e) { console.error('Firecrawl error:', e); }
    }

    // Fallback to basic fetch
    if (!pageContent) {
      try {
        const res = await fetch(formattedUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        });
        pageContent = await res.text();
        pageContent = pageContent.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').substring(0, 30000);
      } catch (e) { console.error('Fetch error:', e); }
    }

    if (!pageContent) {
      return new Response(JSON.stringify({ error: 'Could not fetch page content' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Use AI to extract company info
    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: `Extract company information from this webpage content. Return ONLY valid JSON (no markdown, no code blocks):
{
  "name": "Company Name",
  "description": "Brief 2-3 sentence description",
  "industry": "Industry name",
  "tech_stack": ["tech1", "tech2"],
  "lead_status": "active or lead or cold",
  "logo_url": "URL if found"
}

Rules:
- lead_status: "active" if they're actively hiring or have open positions, "lead" if general company page, "cold" if outdated
- tech_stack: programming languages, frameworks, tools mentioned
- Be concise and accurate

Page content from ${formattedUrl}:
${pageContent}`
        }],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    // Parse JSON from response
    let company: any = {};
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) company = JSON.parse(jsonMatch[0]);
    } catch { console.error('Failed to parse AI response:', content); }

    return new Response(JSON.stringify({ company, source_url: formattedUrl }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
