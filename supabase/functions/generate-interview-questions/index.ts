import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { jobTitle, companyName, jobDescription, language } = await req.json();

    if (!jobTitle) {
      return new Response(
        JSON.stringify({ error: 'Job title is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isHebrew = language === 'he';

    // Build prompt for generating interview questions
    const systemPrompt = isHebrew
      ? `אתה מומחה גיוס עם ניסיון רב בראיונות עבודה. עליך ליצור שאלות ראיון מקצועיות ורלוונטיות.
         צור 8 שאלות ראיון עבור תפקיד "${jobTitle}"${companyName ? ` בחברת ${companyName}` : ''}.
         חלק את השאלות ל-3 קטגוריות: behavioral (התנהגותי), technical (טכני), situational (סיטואציוני).
         לכל שאלה, הוסף טיפ קצר למועמד.
         החזר JSON עם מערך questions שכל אובייקט מכיל: id, question, category, tip.`
      : `You are an expert recruiter with extensive interview experience. Create professional, relevant interview questions.
         Generate 8 interview questions for a "${jobTitle}" position${companyName ? ` at ${companyName}` : ''}.
         Divide questions into 3 categories: behavioral, technical, situational.
         For each question, add a brief tip for the candidate.
         Return JSON with a questions array where each object has: id, question, category, tip.`;

    const userPrompt = jobDescription 
      ? `Job Description:\n${jobDescription}\n\nGenerate questions based on this description.`
      : `Generate general questions for this role.`;

    // Call Lovable AI
    const response = await fetch('https://api.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error('Failed to generate questions');
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    let questions;
    try {
      const parsed = JSON.parse(content);
      questions = parsed.questions || parsed;
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse AI response');
    }

    console.log(`Generated ${questions.length} questions for ${jobTitle}`);

    return new Response(
      JSON.stringify({ questions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
