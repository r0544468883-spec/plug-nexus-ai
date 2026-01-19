import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation
const MAX_FILE_NAME_LENGTH = 255;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Allow https and Supabase storage URLs
    if (parsed.protocol !== 'https:') {
      return false;
    }
    // Block internal/private IPs
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname.startsWith('127.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname) ||
      hostname.startsWith('169.254.') ||
      hostname === '0.0.0.0' ||
      hostname === '169.254.169.254'
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

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

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create client with user's token
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
    console.log('Authenticated user for analyze-resume:', authenticatedUserId);

    const { fileUrl, fileName, documentId } = await req.json();

    // Validate inputs
    if (!fileUrl || typeof fileUrl !== 'string') {
      return new Response(
        JSON.stringify({ error: 'fileUrl is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isValidUrl(fileUrl)) {
      return new Response(
        JSON.stringify({ error: 'Invalid file URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (fileName && (typeof fileName !== 'string' || fileName.length > MAX_FILE_NAME_LENGTH)) {
      return new Response(
        JSON.stringify({ error: 'Invalid fileName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (documentId && !UUID_REGEX.test(documentId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid documentId format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If documentId is provided, verify the user owns the document
    if (documentId) {
      const { data: document, error: docError } = await supabaseClient
        .from('documents')
        .select('owner_id')
        .eq('id', documentId)
        .single();

      if (docError || !document) {
        return new Response(
          JSON.stringify({ error: 'Document not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (document.owner_id !== authenticatedUserId) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized - you do not own this document' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create admin client for updating documents
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Download the file content
    let fileContent = "";
    
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error("Failed to download file");
      }
      
      // For text-based analysis, we'll extract what we can
      // Note: For PDFs, we'd need a PDF parser. For now, we'll send the URL to Gemini
      // which can analyze documents directly
      const blob = await response.blob();
      const base64 = await blobToBase64(blob);
      fileContent = base64;
    } catch (e) {
      console.error("Error downloading file:", e);
    }

    const systemPrompt = `You are an expert HR analyst specializing in resume analysis. Analyze the provided resume and extract:

1. **Skills** - Technical and soft skills
2. **Experience Summary** - Years of experience and key roles
3. **Education** - Degrees and certifications
4. **Strengths** - What makes this candidate stand out
5. **Suggested Roles** - Job titles this person would be suited for
6. **Improvement Tips** - Suggestions to improve the resume

Respond in JSON format with this exact structure:
{
  "skills": {
    "technical": ["skill1", "skill2"],
    "soft": ["skill1", "skill2"],
    "languages": ["language1", "language2"]
  },
  "experience": {
    "totalYears": number,
    "summary": "brief summary",
    "recentRole": "most recent job title"
  },
  "education": {
    "highest": "degree name",
    "certifications": ["cert1", "cert2"]
  },
  "strengths": ["strength1", "strength2"],
  "suggestedRoles": ["role1", "role2"],
  "improvementTips": ["tip1", "tip2"],
  "overallScore": number (1-100)
}`;

    // Use Gemini's vision capabilities to analyze the document
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: [
              { type: "text", text: `Please analyze this resume (${fileName || 'resume'}):` },
              { 
                type: "image_url", 
                image_url: { url: fileContent.startsWith("data:") ? fileContent : fileUrl } 
              }
            ]
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI analysis error:", response.status, errorText);
      throw new Error("AI analysis failed");
    }

    const data = await response.json();
    const analysisContent = data.choices?.[0]?.message?.content;
    
    let analysis;
    try {
      analysis = JSON.parse(analysisContent);
    } catch {
      // If JSON parsing fails, create a basic structure
      analysis = {
        skills: { technical: [], soft: [], languages: [] },
        experience: { totalYears: 0, summary: analysisContent, recentRole: "" },
        education: { highest: "", certifications: [] },
        strengths: [],
        suggestedRoles: [],
        improvementTips: [],
        overallScore: 70,
        rawAnalysis: analysisContent,
      };
    }

    // Update the document with the AI summary (using admin client since we verified ownership)
    if (documentId) {
      const { error: updateError } = await supabaseAdmin
        .from("documents")
        .update({ ai_summary: analysis })
        .eq("id", documentId)
        .eq("owner_id", authenticatedUserId); // Double-check ownership

      if (updateError) {
        console.error("Error updating document:", updateError);
      }
    }

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-resume error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Analysis failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  const mimeType = blob.type || "application/pdf";
  return `data:${mimeType};base64,${base64}`;
}
