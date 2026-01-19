import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Job taxonomy for AI matching
const JOB_FIELDS = [
  { slug: 'tech', name_en: 'Hi-Tech & IT', keywords: ['software', 'developer', 'engineer', 'programming', 'coding', 'tech', 'IT', 'digital', 'computer', 'data', 'cyber', 'devops', 'cloud', 'mobile', 'web', 'frontend', 'backend', 'fullstack', 'QA', 'product manager', 'scrum'] },
  { slug: 'marketing', name_en: 'Marketing & Advertising', keywords: ['marketing', 'advertising', 'seo', 'sem', 'social media', 'content', 'brand', 'campaign', 'digital marketing', 'growth', 'acquisition', 'retention'] },
  { slug: 'sales', name_en: 'Sales', keywords: ['sales', 'business development', 'account', 'customer success', 'SDR', 'BDR', 'enterprise', 'B2B', 'B2C'] },
  { slug: 'finance', name_en: 'Finance & Economics', keywords: ['finance', 'accounting', 'financial', 'investment', 'banking', 'budget', 'controller', 'CFO', 'analyst'] },
  { slug: 'engineering', name_en: 'Engineering', keywords: ['mechanical', 'electrical', 'civil', 'chemical', 'industrial', 'engineer'] },
  { slug: 'hr', name_en: 'HR & Recruitment', keywords: ['HR', 'human resources', 'recruiter', 'recruiting', 'talent', 'people', 'compensation', 'benefits'] },
  { slug: 'management', name_en: 'Management & Admin', keywords: ['manager', 'management', 'admin', 'administrative', 'office', 'executive', 'director', 'CEO', 'COO', 'operations'] },
  { slug: 'customer-service', name_en: 'Customer Service & Support', keywords: ['customer service', 'support', 'helpdesk', 'client', 'call center'] },
  { slug: 'design', name_en: 'Design & Creative', keywords: ['design', 'designer', 'UX', 'UI', 'graphic', 'creative', 'visual', 'art'] },
  { slug: 'data', name_en: 'Data & Analytics', keywords: ['data', 'analytics', 'analyst', 'BI', 'business intelligence', 'statistics', 'machine learning', 'AI'] },
  { slug: 'healthcare', name_en: 'Healthcare & Medical', keywords: ['healthcare', 'medical', 'health', 'nurse', 'doctor', 'clinical', 'pharma', 'biotech'] },
  { slug: 'education', name_en: 'Education & Teaching', keywords: ['education', 'teaching', 'teacher', 'instructor', 'training', 'learning'] },
  { slug: 'legal', name_en: 'Legal', keywords: ['legal', 'lawyer', 'attorney', 'law', 'compliance', 'contract'] },
  { slug: 'logistics', name_en: 'Logistics & Shipping', keywords: ['logistics', 'shipping', 'supply chain', 'warehouse', 'transportation'] },
  { slug: 'hospitality', name_en: 'Hospitality & Tourism', keywords: ['hospitality', 'hotel', 'tourism', 'travel', 'restaurant', 'food'] },
  { slug: 'retail', name_en: 'Retail & Commerce', keywords: ['retail', 'store', 'shop', 'ecommerce', 'commerce', 'merchandising'] },
];

const EXPERIENCE_LEVELS = [
  { slug: 'entry', name_en: 'Entry Level / Student', years_min: 0, years_max: 0, keywords: ['entry', 'student', 'internship', 'intern', 'graduate', 'no experience', 'junior', '0-1 years'] },
  { slug: 'junior', name_en: 'Junior', years_min: 1, years_max: 2, keywords: ['junior', '1-2 years', '1-3 years', 'early career'] },
  { slug: 'mid', name_en: 'Mid-Level', years_min: 3, years_max: 5, keywords: ['mid', 'mid-level', '3-5 years', '2-4 years', '3+ years'] },
  { slug: 'senior', name_en: 'Senior', years_min: 6, years_max: 10, keywords: ['senior', '5+ years', '5-7 years', '6+ years', 'experienced'] },
  { slug: 'lead', name_en: 'Lead / Team Lead', years_min: 8, years_max: 15, keywords: ['lead', 'team lead', 'tech lead', 'principal', '8+ years', '10+ years'] },
  { slug: 'executive', name_en: 'Executive / Director', years_min: 15, years_max: null, keywords: ['executive', 'director', 'VP', 'C-level', 'CTO', 'CEO', 'head of', 'chief'] },
];

// Helper function to detect field from job content
function detectField(title: string, description: string, requirements: string): string | null {
  const content = `${title} ${description} ${requirements}`.toLowerCase();
  
  for (const field of JOB_FIELDS) {
    for (const keyword of field.keywords) {
      if (content.includes(keyword.toLowerCase())) {
        return field.slug;
      }
    }
  }
  return null;
}

// Helper function to detect experience level from job content
function detectExperienceLevel(title: string, description: string, requirements: string): string | null {
  const content = `${title} ${description} ${requirements}`.toLowerCase();
  
  // Check for year patterns first
  const yearsMatch = content.match(/(\d+)[+-]?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience)?/i);
  if (yearsMatch) {
    const years = parseInt(yearsMatch[1]);
    if (years === 0) return 'entry';
    if (years <= 2) return 'junior';
    if (years <= 5) return 'mid';
    if (years <= 10) return 'senior';
    if (years <= 15) return 'lead';
    return 'executive';
  }
  
  // Check for keyword patterns
  for (const level of EXPERIENCE_LEVELS) {
    for (const keyword of level.keywords) {
      if (content.includes(keyword.toLowerCase())) {
        return level.slug;
      }
    }
  }
  
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { url, save, user_id, manual } = body;
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Handle manual application creation
    if (manual && user_id) {
      const { company_name, job_title, location, job_type, description, source_url } = body;
      
      if (!company_name || !job_title) {
        return new Response(
          JSON.stringify({ error: 'Company name and job title are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Find or create company
      let companyId: string | null = null;
      
      const { data: existingCompany } = await supabaseAdmin
        .from('companies')
        .select('id')
        .ilike('name', company_name)
        .maybeSingle();

      if (existingCompany) {
        companyId = existingCompany.id;
      } else {
        const { data: newCompany, error: companyError } = await supabaseAdmin
          .from('companies')
          .insert({
            name: company_name,
            created_by: user_id,
          })
          .select('id')
          .single();

        if (companyError) {
          console.error('Error creating company:', companyError);
          throw new Error('Failed to create company');
        }
        companyId = newCompany.id;
      }

      // Create job
      const { data: job, error: jobError } = await supabaseAdmin
        .from('jobs')
        .insert({
          title: job_title,
          company_id: companyId,
          location: location || null,
          job_type: job_type || null,
          description: description || null,
          source_url: source_url || null,
          created_by: user_id,
        })
        .select('id')
        .single();

      if (jobError) {
        console.error('Error creating job:', jobError);
        throw new Error('Failed to create job');
      }

      // Create application
      const { data: application, error: appError } = await supabaseAdmin
        .from('applications')
        .insert({
          job_id: job.id,
          candidate_id: user_id,
          status: 'active',
          current_stage: 'applied',
        })
        .select('id')
        .single();

      if (appError) {
        console.error('Error creating application:', appError);
        throw new Error('Failed to create application');
      }

      // Add timeline event
      await supabaseAdmin
        .from('application_timeline')
        .insert({
          application_id: application.id,
          event_type: 'created',
          description: 'Application created manually',
        });

      return new Response(
        JSON.stringify({
          success: true,
          saved: true,
          application_id: application.id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Fetch the job page content
    let pageContent = '';
    try {
      const pageResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      pageContent = await pageResponse.text();
      // Clean HTML - remove scripts and styles, keep text
      pageContent = pageContent
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .substring(0, 15000); // Limit context size
    } catch (fetchError) {
      console.error('Error fetching URL:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch job page. Please check the URL.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Lovable AI to extract job details
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `You are a job posting analyzer. Extract structured job information from the provided text.
Always respond with valid JSON in this exact format:
{
  "company_name": "string",
  "job_title": "string",
  "location": "string or null",
  "job_type": "full-time | part-time | contract | freelance | null",
  "salary_range": "string or null",
  "description": "string (2-3 sentences summary)",
  "requirements": "string (comma-separated key requirements)",
  "years_of_experience": "number or null (estimated years required)"
}
If you cannot extract a field, use null. Always return valid JSON.`
          },
          {
            role: 'user',
            content: `Extract job details from this job posting:\n\nURL: ${url}\n\nContent:\n${pageContent}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_job_details",
              description: "Extract structured job information from the job posting",
              parameters: {
                type: "object",
                properties: {
                  company_name: { type: "string", description: "Name of the hiring company" },
                  job_title: { type: "string", description: "Job title/position" },
                  location: { type: "string", description: "Job location" },
                  job_type: { 
                    type: "string", 
                    enum: ["full-time", "part-time", "contract", "freelance"],
                    description: "Type of employment"
                  },
                  salary_range: { type: "string", description: "Salary range if mentioned" },
                  description: { type: "string", description: "Brief job description (2-3 sentences)" },
                  requirements: { type: "string", description: "Key requirements, comma-separated" },
                  years_of_experience: { type: "number", description: "Estimated years of experience required" }
                },
                required: ["company_name", "job_title"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_job_details" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    
    // Extract from tool call response
    let jobDetails;
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      jobDetails = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: try to parse from content
      const content = aiData.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jobDetails = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse job details from AI response');
      }
    }

    // Detect field and experience level from taxonomy
    const detectedFieldSlug = detectField(
      jobDetails.job_title || '',
      jobDetails.description || '',
      jobDetails.requirements || ''
    );
    
    const detectedExpLevelSlug = detectExperienceLevel(
      jobDetails.job_title || '',
      jobDetails.description || '',
      jobDetails.requirements || ''
    );

    console.log('Detected field:', detectedFieldSlug);
    console.log('Detected experience level:', detectedExpLevelSlug);

    // Fetch taxonomy IDs from database
    let fieldId: string | null = null;
    let roleId: string | null = null;
    let experienceLevelId: string | null = null;

    if (detectedFieldSlug) {
      const { data: field } = await supabaseAdmin
        .from('job_fields')
        .select('id')
        .eq('slug', detectedFieldSlug)
        .single();
      if (field) fieldId = field.id;
    }

    if (detectedExpLevelSlug) {
      const { data: expLevel } = await supabaseAdmin
        .from('experience_levels')
        .select('id')
        .eq('slug', detectedExpLevelSlug)
        .single();
      if (expLevel) experienceLevelId = expLevel.id;
    }

    // Add taxonomy info to response
    jobDetails.detected_field_slug = detectedFieldSlug;
    jobDetails.detected_experience_level_slug = detectedExpLevelSlug;
    jobDetails.field_id = fieldId;
    jobDetails.experience_level_id = experienceLevelId;

    // If save is requested, save to database using service role
    if (save && user_id) {
      // Find or create company
      let companyId: string | null = null;
      
      const { data: existingCompany } = await supabaseAdmin
        .from('companies')
        .select('id')
        .ilike('name', jobDetails.company_name)
        .maybeSingle();

      if (existingCompany) {
        companyId = existingCompany.id;
      } else {
        const { data: newCompany, error: companyError } = await supabaseAdmin
          .from('companies')
          .insert({
            name: jobDetails.company_name,
            created_by: user_id,
          })
          .select('id')
          .single();

        if (companyError) {
          console.error('Error creating company:', companyError);
          throw new Error('Failed to create company');
        }
        companyId = newCompany.id;
      }

      // Create job with taxonomy
      const { data: job, error: jobError } = await supabaseAdmin
        .from('jobs')
        .insert({
          title: jobDetails.job_title,
          company_id: companyId,
          location: jobDetails.location,
          job_type: jobDetails.job_type,
          salary_range: jobDetails.salary_range,
          description: jobDetails.description,
          requirements: jobDetails.requirements,
          source_url: url,
          created_by: user_id,
          field_id: fieldId,
          role_id: roleId,
          experience_level_id: experienceLevelId,
          category: detectedFieldSlug,
        })
        .select('id')
        .single();

      if (jobError) {
        console.error('Error creating job:', jobError);
        throw new Error('Failed to create job');
      }

      // Create application
      const { data: application, error: appError } = await supabaseAdmin
        .from('applications')
        .insert({
          job_id: job.id,
          candidate_id: user_id,
          status: 'active',
          current_stage: 'applied',
        })
        .select('id')
        .single();

      if (appError) {
        console.error('Error creating application:', appError);
        throw new Error('Failed to create application');
      }

      // Add timeline event
      await supabaseAdmin
        .from('application_timeline')
        .insert({
          application_id: application.id,
          event_type: 'created',
          description: 'Application created from URL',
        });

      return new Response(
        JSON.stringify({
          success: true,
          saved: true,
          job: {
            ...jobDetails,
            source_url: url
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        job: {
          ...jobDetails,
          source_url: url
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in scrape-job:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
