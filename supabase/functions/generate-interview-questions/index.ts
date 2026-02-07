import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    console.log(`Generating questions for: ${jobTitle}${companyName ? ` at ${companyName}` : ''}`);

    // Call Lovable AI Gateway (CORRECT URL)
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded, please try again later' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted, please add funds' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in AI response:', aiResponse);
      throw new Error('No content in AI response');
    }

    console.log('AI response received, parsing...');

    let questions;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        questions = parsed.questions || parsed;
      } else {
        // Try parsing directly
        const parsed = JSON.parse(content);
        questions = parsed.questions || parsed;
      }
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      // Create fallback questions
      questions = [
        { id: '1', question: isHebrew ? 'ספר לי על עצמך ועל הניסיון שלך' : 'Tell me about yourself and your experience', category: 'behavioral', tip: isHebrew ? 'התמקד בניסיון הרלוונטי לתפקיד' : 'Focus on experience relevant to the role' },
        { id: '2', question: isHebrew ? 'מהן החוזקות העיקריות שלך?' : 'What are your main strengths?', category: 'behavioral', tip: isHebrew ? 'תן דוגמאות קונקרטיות' : 'Give concrete examples' },
        { id: '3', question: isHebrew ? 'איך אתה מתמודד עם לחץ?' : 'How do you handle pressure?', category: 'situational', tip: isHebrew ? 'שתף מצב אמיתי' : 'Share a real situation' },
        { id: '4', question: isHebrew ? 'למה אתה רוצה לעבוד אצלנו?' : 'Why do you want to work with us?', category: 'behavioral', tip: isHebrew ? 'חקור את החברה מראש' : 'Research the company beforehand' },
        { id: '5', question: isHebrew ? 'תאר אתגר טכני שפתרת' : 'Describe a technical challenge you solved', category: 'technical', tip: isHebrew ? 'השתמש בשיטת STAR' : 'Use the STAR method' },
      ];
    }

    // Ensure questions have proper structure
    questions = questions.map((q: any, index: number) => ({
      id: q.id || String(index + 1),
      question: q.question || q.text || '',
      category: q.category || 'behavioral',
      tip: q.tip || '',
    })).filter((q: any) => q.question);

    console.log(`Generated ${questions.length} questions for ${jobTitle}`);

    return new Response(
      JSON.stringify({ questions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate interview questions. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
