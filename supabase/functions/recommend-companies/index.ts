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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { fieldSlug, limit = 10 } = await req.json();

    console.log('Recommending companies for user:', user.id, 'field:', fieldSlug);

    // Get user's resume data for context
    const { data: resume } = await supabase
      .from('documents')
      .select('ai_summary')
      .eq('owner_id', user.id)
      .eq('doc_type', 'cv')
      .maybeSingle();

    // Get user's preferences
    const { data: profile } = await supabase
      .from('profiles')
      .select('preferred_fields, preferred_roles, experience_years')
      .eq('user_id', user.id)
      .single();

    // Build query for companies
    let companiesQuery = supabase
      .from('companies')
      .select(`
        id, name, description, industry, website, logo_url, size,
        avg_hiring_speed_days, total_hires
      `)
      .not('website', 'is', null)
      .order('total_hires', { ascending: false, nullsFirst: false })
      .limit(limit);

    // If field filter provided, join with jobs to filter by field
    if (fieldSlug) {
      // Get field ID first
      const { data: fieldData } = await supabase
        .from('job_fields')
        .select('id')
        .eq('slug', fieldSlug)
        .maybeSingle();

      if (fieldData) {
        // Get companies that have jobs in this field
        const { data: jobsInField } = await supabase
          .from('jobs')
          .select('company_id')
          .eq('field_id', fieldData.id)
          .eq('status', 'active')
          .not('company_id', 'is', null);

        const companyIds = [...new Set(jobsInField?.map(j => j.company_id) || [])];
        
        if (companyIds.length > 0) {
          companiesQuery = companiesQuery.in('id', companyIds);
        }
      }
    }

    const { data: companies, error: companiesError } = await companiesQuery;

    if (companiesError) {
      throw new Error('Failed to fetch companies: ' + companiesError.message);
    }

    // Enrich with active job counts
    const enrichedCompanies = await Promise.all(
      (companies || []).map(async (company) => {
        const { count } = await supabase
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', company.id)
          .eq('status', 'active');

        return {
          ...company,
          activeJobsCount: count || 0,
          matchReason: getMatchReason(company, profile, resume?.ai_summary),
        };
      })
    );

    // Sort by relevance (active jobs + hiring speed)
    const sortedCompanies = enrichedCompanies.sort((a, b) => {
      const scoreA = (a.activeJobsCount * 10) + (a.total_hires || 0) - (a.avg_hiring_speed_days || 30);
      const scoreB = (b.activeJobsCount * 10) + (b.total_hires || 0) - (b.avg_hiring_speed_days || 30);
      return scoreB - scoreA;
    });

    return new Response(
      JSON.stringify({
        success: true,
        companies: sortedCompanies,
        totalFound: sortedCompanies.length,
        filterApplied: fieldSlug || null,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in recommend-companies:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500,
      }
    );
  }
});

function getMatchReason(
  company: { industry?: string | null; size?: string | null },
  profile: { preferred_fields?: string[] | null; experience_years?: number | null } | null,
  resumeSummary: unknown
): string {
  const reasons: string[] = [];

  if (company.industry) {
    reasons.push(`Industry: ${company.industry}`);
  }

  if (company.size) {
    reasons.push(`Company size: ${company.size}`);
  }

  if (profile?.experience_years && profile.experience_years > 5) {
    reasons.push('Good fit for experienced professionals');
  }

  if (resumeSummary && typeof resumeSummary === 'object' && 'skills' in resumeSummary) {
    reasons.push('Skills match detected');
  }

  return reasons.length > 0 ? reasons.join(' • ') : 'Based on your preferences';
}
