import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Platform configurations for job search
interface PlatformConfig {
  name: string;
  searchUrlTemplate: (query: string, location: string) => string;
  waitFor: number;
}

const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  linkedin: {
    name: 'LinkedIn',
    searchUrlTemplate: (query, location) => 
      `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}&f_TPR=r604800`, // Last week
    waitFor: 5000,
  },
  alljobs: {
    name: 'AllJobs',
    searchUrlTemplate: (query, location) => 
      `https://www.alljobs.co.il/SearchResultsGuest.aspx?page=1&position=${encodeURIComponent(query)}&type=&freetxt=&city=${encodeURIComponent(location)}`,
    waitFor: 3000,
  },
  drushim: {
    name: 'Drushim',
    searchUrlTemplate: (query, location) => 
      `https://www.drushim.co.il/jobs/search/${encodeURIComponent(query)}/?area=${encodeURIComponent(location)}`,
    waitFor: 3000,
  },
};

// Extract job URLs from search results page
function extractJobUrls(content: string, platform: string, links?: string[]): string[] {
  const urls: string[] = [];
  
  console.log(`Extracting URLs for platform: ${platform}`);
  console.log(`Content length: ${content.length}`);
  console.log(`Links array length: ${links?.length || 0}`);
  
  // First, check the links array (more reliable)
  if (links && links.length > 0) {
    for (const link of links) {
      const url = typeof link === 'string' ? link : (link as any).url || '';
      if (!url) continue;
      
      if (platform === 'linkedin' && url.includes('/jobs/view/')) {
        const cleanUrl = url.split('?')[0];
        if (!urls.includes(cleanUrl)) urls.push(cleanUrl);
      }
      if (platform === 'alljobs' && (url.includes('/Job/') || url.includes('/jobs/') || url.includes('ShowJob'))) {
        if (!urls.includes(url)) urls.push(url);
      }
      if (platform === 'drushim' && url.includes('/job/')) {
        if (!urls.includes(url)) urls.push(url);
      }
    }
  }
  
  // Fallback: extract from content using regex
  // LinkedIn job URLs - multiple patterns
  if (platform === 'linkedin') {
    // Pattern 1: Full URLs
    const fullUrlMatches = content.matchAll(/https?:\/\/(?:www\.)?linkedin\.com\/jobs\/view\/(\d+)/gi);
    for (const match of fullUrlMatches) {
      const url = `https://www.linkedin.com/jobs/view/${match[1]}`;
      if (!urls.includes(url)) urls.push(url);
    }
    // Pattern 2: Escaped URLs in JSON
    const escapedMatches = content.matchAll(/linkedin\.com\\?\/jobs\\?\/view\\?\/(\d+)/gi);
    for (const match of escapedMatches) {
      const url = `https://www.linkedin.com/jobs/view/${match[1]}`;
      if (!urls.includes(url)) urls.push(url);
    }
  }
  
  // AllJobs job URLs - Israeli job board
  if (platform === 'alljobs') {
    // Pattern 1: /Job/ URLs (new format)
    const jobMatches = content.matchAll(/https?:\/\/(?:www\.)?alljobs\.co\.il\/Job\/(\d+)/gi);
    for (const match of jobMatches) {
      const url = `https://www.alljobs.co.il/Job/${match[1]}`;
      if (!urls.includes(url)) urls.push(url);
    }
    // Pattern 2: ShowJob URLs (old format)
    const showJobMatches = content.matchAll(/https?:\/\/(?:www\.)?alljobs\.co\.il\/ShowJob\.asp[^"'\s<>]*/gi);
    for (const match of showJobMatches) {
      if (!urls.includes(match[0])) urls.push(match[0]);
    }
    // Pattern 3: /jobs/ URLs
    const jobsMatches = content.matchAll(/https?:\/\/(?:www\.)?alljobs\.co\.il\/jobs\/[^"'\s<>]+/gi);
    for (const match of jobsMatches) {
      if (!urls.includes(match[0])) urls.push(match[0]);
    }
  }
  
  // Drushim job URLs - Israeli job board  
  if (platform === 'drushim') {
    // Pattern 1: /job/ URLs
    const jobMatches = content.matchAll(/https?:\/\/(?:www\.)?drushim\.co\.il\/job\/(\d+)/gi);
    for (const match of jobMatches) {
      const url = `https://www.drushim.co.il/job/${match[1]}`;
      if (!urls.includes(url)) urls.push(url);
    }
    // Pattern 2: Jobs with slugs
    const slugMatches = content.matchAll(/https?:\/\/(?:www\.)?drushim\.co\.il\/jobs\/[^"'\s<>]+/gi);
    for (const match of slugMatches) {
      if (!urls.includes(match[0])) urls.push(match[0]);
    }
  }
  
  console.log(`Found ${urls.length} URLs for ${platform}:`, urls.slice(0, 5));
  
  return urls.slice(0, 20); // Limit to 20 jobs per search
}

// AI extraction prompt for job details
function getExtractionPrompt(content: string): string {
  return `Extract job details from this content. Return a JSON object with these fields:
- company_name: string (company/employer name)
- job_title: string (position title)  
- location: string (city/region or "Remote")
- job_type: string ("Full-time", "Part-time", "Contract", "Internship")
- salary_range: string (if mentioned)
- description: string (job description summary, max 500 chars)
- requirements: string (key requirements, max 300 chars)

If a field cannot be found, use null. Respond ONLY with valid JSON.

Content:
${content.substring(0, 8000)}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  
  const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!FIRECRAWL_API_KEY) {
    console.error('FIRECRAWL_API_KEY not configured');
    return new Response(
      JSON.stringify({ error: 'Crawler not configured - missing Firecrawl' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  if (!LOVABLE_API_KEY) {
    console.error('LOVABLE_API_KEY not configured');
    return new Response(
      JSON.stringify({ error: 'Crawler not configured - missing AI key' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { platform, query, location, runId, globalCrawl } = body;
    
    // Global crawl mode - runs 3 times a day for ALL platforms with predefined queries
    if (globalCrawl === true) {
      console.log('Starting GLOBAL crawl for all platforms...');
      const results = await runGlobalCrawl(supabaseAdmin, FIRECRAWL_API_KEY, LOVABLE_API_KEY);
      
      return new Response(
        JSON.stringify({ success: true, mode: 'global', results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // If specific parameters provided, run single crawl
    if (platform && query) {
      const result = await crawlPlatform(
        supabaseAdmin,
        FIRECRAWL_API_KEY,
        LOVABLE_API_KEY,
        platform,
        query,
        location || 'Israel',
        runId
      );
      
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Default: run global crawl (for scheduled calls)
    console.log('No params - running global crawl...');
    const results = await runGlobalCrawl(supabaseAdmin, FIRECRAWL_API_KEY, LOVABLE_API_KEY);
    
    return new Response(
      JSON.stringify({ success: true, mode: 'global', results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Crawler error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Crawler failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Global predefined search queries for all job seekers
const GLOBAL_SEARCH_QUERIES = [
  // Tech roles
  { query: 'software engineer', location: 'Israel' },
  { query: 'frontend developer', location: 'Israel' },
  { query: 'backend developer', location: 'Israel' },
  { query: 'fullstack developer', location: 'Israel' },
  { query: 'data scientist', location: 'Israel' },
  { query: 'product manager', location: 'Israel' },
  { query: 'devops engineer', location: 'Israel' },
  { query: 'QA engineer', location: 'Israel' },
  // Business roles
  { query: 'marketing manager', location: 'Israel' },
  { query: 'sales manager', location: 'Israel' },
  { query: 'HR manager', location: 'Israel' },
  { query: 'project manager', location: 'Israel' },
  // Hebrew queries for local sites
  { query: 'מפתח תוכנה', location: 'ישראל' },
  { query: 'מנהל מוצר', location: 'ישראל' },
  { query: 'מנהל שיווק', location: 'ישראל' },
];

const ALL_PLATFORMS = ['linkedin', 'alljobs', 'drushim'];

async function runGlobalCrawl(
  supabase: any,
  firecrawlKey: string,
  aiKey: string
): Promise<any[]> {
  console.log('=== GLOBAL CRAWL STARTED ===');
  console.log(`Crawling ${ALL_PLATFORMS.length} platforms with ${GLOBAL_SEARCH_QUERIES.length} queries`);
  
  const results: any[] = [];
  let totalJobsAdded = 0;
  
  // Crawl each platform with each query
  for (const platform of ALL_PLATFORMS) {
    for (const { query, location } of GLOBAL_SEARCH_QUERIES) {
      try {
        console.log(`Crawling ${platform}: "${query}" in "${location}"`);
        
        const result = await crawlPlatform(
          supabase,
          firecrawlKey,
          aiKey,
          platform,
          query,
          location
        );
        
        results.push(result);
        totalJobsAdded += result.jobsAdded || 0;
        
        // Small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (err) {
        console.error(`Error crawling ${platform}/${query}:`, err);
        results.push({ platform, query, location, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }
  }
  
  console.log(`=== GLOBAL CRAWL COMPLETED: ${totalJobsAdded} jobs added ===`);
  
  return results;
}

// Legacy: per-user scheduled crawl (kept for backwards compatibility)
async function runScheduledCrawl(
  supabase: any,
  firecrawlKey: string,
  aiKey: string
): Promise<any[]> {
  console.log('Starting user-specific scheduled crawl...');
  
  // Get all enabled crawler settings
  const { data: settings, error: settingsError } = await supabase
    .from('crawler_settings')
    .select('*')
    .eq('is_enabled', true);
  
  if (settingsError) {
    console.error('Error fetching settings:', settingsError);
    return [];
  }
  
  if (!settings || settings.length === 0) {
    console.log('No active crawler settings found, falling back to global crawl');
    return runGlobalCrawl(supabase, firecrawlKey, aiKey);
  }
  
  const results: any[] = [];
  
  for (const setting of settings) {
    // Check if enough time passed since last run
    if (setting.last_run_at) {
      const lastRun = new Date(setting.last_run_at);
      const hoursSinceLastRun = (Date.now() - lastRun.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastRun < setting.frequency_hours) {
        console.log(`Skipping user ${setting.user_id} - last run was ${hoursSinceLastRun.toFixed(1)} hours ago`);
        continue;
      }
    }
    
    // Run crawl for each platform/query combination
    for (const platform of setting.platforms || ['linkedin']) {
      for (const query of setting.search_queries || ['software engineer']) {
        for (const location of setting.locations || ['Israel']) {
          try {
            const result = await crawlPlatform(
              supabase,
              firecrawlKey,
              aiKey,
              platform,
              query,
              location
            );
            results.push(result);
          } catch (err) {
            console.error(`Error crawling ${platform}/${query}:`, err);
          }
        }
      }
    }
    
    // Update last_run_at
    await supabase
      .from('crawler_settings')
      .update({ last_run_at: new Date().toISOString() })
      .eq('user_id', setting.user_id);
  }
  
  return results;
}

async function crawlPlatform(
  supabase: any,
  firecrawlKey: string,
  aiKey: string,
  platform: string,
  query: string,
  location: string,
  existingRunId?: string
): Promise<any> {
  const config = PLATFORM_CONFIGS[platform];
  if (!config) {
    throw new Error(`Unknown platform: ${platform}`);
  }
  
  console.log(`Crawling ${config.name} for "${query}" in "${location}"`);
  
  // Create or update crawler run record
  let runId = existingRunId;
  if (!runId) {
    const { data: run, error: runError } = await supabase
      .from('crawler_runs')
      .insert({
        platform,
        search_query: `${query} - ${location}`,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    
    if (runError) {
      console.error('Error creating run:', runError);
    } else {
      runId = run.id;
    }
  } else {
    await supabase
      .from('crawler_runs')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', runId);
  }
  
  try {
    // Step 1: Search for jobs using Firecrawl Map
    const searchUrl = config.searchUrlTemplate(query, location);
    console.log('=== CRAWL START ===');
    console.log('Platform:', platform);
    console.log('Query:', query);
    console.log('Location:', location);
    console.log('Search URL:', searchUrl);
    
    const mapResponse = await fetch('https://api.firecrawl.dev/v1/map', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: searchUrl,
        limit: 100,
        includeSubdomains: false,
      }),
    });
    
    const mapData = await mapResponse.json();
    let jobUrls: string[] = [];
    
    console.log('Map response status:', mapResponse.status);
    console.log('Map success:', mapData.success);
    console.log('Map links count:', mapData.links?.length || 0);
    
    if (mapResponse.ok && mapData.success && mapData.links) {
      // Filter for job-specific URLs directly from links
      jobUrls = mapData.links.filter((url: string) => {
        if (platform === 'linkedin') return url.includes('/jobs/view/');
        if (platform === 'alljobs') return url.includes('/Job/') || url.includes('/jobs/') || url.includes('ShowJob');
        if (platform === 'drushim') return url.includes('/job/');
        return false;
      }).slice(0, 20);
      
      console.log('Filtered job URLs from map:', jobUrls.length);
    }
    
    // Fallback: scrape the search page and extract URLs
    if (jobUrls.length === 0) {
      console.log('Map returned no job URLs, trying scrape fallback...');
      
      const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: searchUrl,
          formats: ['markdown', 'links'],
          waitFor: config.waitFor,
          onlyMainContent: false,
        }),
      });
      
      const scrapeData = await scrapeResponse.json();
      
      console.log('Scrape response status:', scrapeResponse.status);
      console.log('Scrape success:', scrapeData.success);
      
      if (scrapeResponse.ok && scrapeData.success) {
        const content = scrapeData.data?.markdown || '';
        const links = scrapeData.data?.links || [];
        
        console.log('Scrape content length:', content.length);
        console.log('Scrape links count:', links.length);
        
        // Extract from content and links
        jobUrls = extractJobUrls(content, platform, links);
      }
    }
    
    console.log(`=== FOUND ${jobUrls.length} JOB URLs ===`);
    
    // Step 2: Filter out already discovered jobs
    const newUrls: string[] = [];
    for (const url of jobUrls) {
      const { data: existing } = await supabase
        .from('crawler_discovered_jobs')
        .select('id')
        .eq('source_url', url)
        .maybeSingle();
      
      if (!existing) {
        newUrls.push(url);
      }
    }
    
    console.log(`${newUrls.length} new job URLs to process`);
    
    // Step 3: Process each new job
    let jobsAdded = 0;
    
    for (const jobUrl of newUrls.slice(0, 10)) { // Limit to 10 per run
      try {
        // Record discovery
        await supabase
          .from('crawler_discovered_jobs')
          .insert({
            source_url: jobUrl,
            platform,
            status: 'discovered',
          });
        
        // Scrape job details
        const jobScrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: jobUrl,
            formats: ['markdown'],
            onlyMainContent: true,
            waitFor: config.waitFor,
          }),
        });
        
        const jobScrapeData = await jobScrapeResponse.json();
        
        if (!jobScrapeResponse.ok || !jobScrapeData.success || !jobScrapeData.data?.markdown) {
          console.log(`Failed to scrape ${jobUrl}`);
          await supabase
            .from('crawler_discovered_jobs')
            .update({ status: 'failed' })
            .eq('source_url', jobUrl);
          continue;
        }
        
        const jobContent = jobScrapeData.data.markdown;
        
        // Extract job details using AI
        const aiResponse = await fetch('https://api.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${aiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-lite',
            messages: [
              {
                role: 'user',
                content: getExtractionPrompt(jobContent),
              },
            ],
            temperature: 0.1,
          }),
        });
        
        const aiData = await aiResponse.json();
        const aiContent = aiData.choices?.[0]?.message?.content || '';
        
        // Parse AI response
        let jobDetails;
        try {
          const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jobDetails = JSON.parse(jsonMatch[0]);
          }
        } catch (parseErr) {
          console.error('Failed to parse AI response:', parseErr);
          await supabase
            .from('crawler_discovered_jobs')
            .update({ status: 'failed' })
            .eq('source_url', jobUrl);
          continue;
        }
        
        if (!jobDetails?.company_name || !jobDetails?.job_title) {
          console.log('Missing required fields for', jobUrl);
          await supabase
            .from('crawler_discovered_jobs')
            .update({ status: 'failed' })
            .eq('source_url', jobUrl);
          continue;
        }
        
        // Find or create company
        let companyId: string | null = null;
        
        const { data: existingCompany } = await supabase
          .from('companies')
          .select('id')
          .ilike('name', jobDetails.company_name)
          .maybeSingle();
        
        if (existingCompany) {
          companyId = existingCompany.id;
        } else {
          const { data: newCompany } = await supabase
            .from('companies')
            .insert({ name: jobDetails.company_name })
            .select('id')
            .single();
          
          companyId = newCompany?.id;
        }
        
        // Check for duplicate job
        const { data: existingJob } = await supabase
          .from('jobs')
          .select('id')
          .eq('source_url', jobUrl)
          .maybeSingle();
        
        if (existingJob) {
          await supabase
            .from('crawler_discovered_jobs')
            .update({ 
              status: 'duplicate',
              job_id: existingJob.id,
              processed_at: new Date().toISOString(),
            })
            .eq('source_url', jobUrl);
          continue;
        }
        
        // Create job
        const { data: newJob, error: jobError } = await supabase
          .from('jobs')
          .insert({
            title: jobDetails.job_title,
            company_id: companyId,
            location: jobDetails.location || null,
            job_type: jobDetails.job_type || null,
            salary_range: jobDetails.salary_range || null,
            description: jobDetails.description || null,
            requirements: jobDetails.requirements || null,
            source_url: jobUrl,
            status: 'active',
            is_community_shared: true, // Make available to all users
          })
          .select('id')
          .single();
        
        if (jobError) {
          console.error('Error creating job:', jobError);
          await supabase
            .from('crawler_discovered_jobs')
            .update({ status: 'failed' })
            .eq('source_url', jobUrl);
          continue;
        }
        
        // Update discovered job record
        await supabase
          .from('crawler_discovered_jobs')
          .update({
            title: jobDetails.job_title,
            company_name: jobDetails.company_name,
            status: 'processed',
            job_id: newJob.id,
            processed_at: new Date().toISOString(),
          })
          .eq('source_url', jobUrl);
        
        jobsAdded++;
        console.log(`Added job: ${jobDetails.job_title} at ${jobDetails.company_name}`);
        
      } catch (jobErr) {
        console.error(`Error processing ${jobUrl}:`, jobErr);
      }
    }
    
    // Update run record
    if (runId) {
      await supabase
        .from('crawler_runs')
        .update({
          status: 'completed',
          jobs_found: jobUrls.length,
          jobs_added: jobsAdded,
          completed_at: new Date().toISOString(),
        })
        .eq('id', runId);
    }
    
    return {
      success: true,
      platform,
      query,
      location,
      jobsFound: jobUrls.length,
      jobsAdded,
    };
    
  } catch (error) {
    console.error('Crawl error:', error);
    
    if (runId) {
      await supabase
        .from('crawler_runs')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date().toISOString(),
        })
        .eq('id', runId);
    }
    
    throw error;
  }
}
