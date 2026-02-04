import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CVData {
  personalInfo: {
    fullName: string;
    title: string;
    email: string;
    phone: string;
    location: string;
    summary: string;
  };
  experience: Array<{
    company: string;
    role: string;
    startDate: string;
    endDate: string | null;
    current: boolean;
    bullets: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    startDate: string;
    endDate: string;
  }>;
  skills: {
    technical: string[];
    soft: string[];
    languages: Array<{ name: string; level: string }>;
  };
  projects: Array<{
    name: string;
    description: string;
    url?: string;
  }>;
  settings: {
    templateId: string;
    accentColor: string;
    fontSize: string;
    fontFamily: string;
    colorPreset: string;
    spacing: string;
    orientation: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cvData, style } = await req.json() as { cvData: CVData; style?: string };
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build a comprehensive prompt for generating a professional CV image
    const colorPresetName = cvData.settings.colorPreset || 'default';
    const accentColor = cvData.settings.accentColor || '#3b82f6';
    const orientation = cvData.settings.orientation || 'portrait';
    const fontFamily = cvData.settings.fontFamily || 'inter';
    
    const experienceText = cvData.experience.map(exp => 
      `- ${exp.role} at ${exp.company} (${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}): ${exp.bullets.join('; ')}`
    ).join('\n');
    
    const educationText = cvData.education.map(edu =>
      `- ${edu.degree} in ${edu.field} from ${edu.institution} (${edu.startDate} - ${edu.endDate})`
    ).join('\n');
    
    const skillsText = [
      cvData.skills.technical.length ? `Technical: ${cvData.skills.technical.join(', ')}` : '',
      cvData.skills.soft.length ? `Soft skills: ${cvData.skills.soft.join(', ')}` : '',
      cvData.skills.languages.length ? `Languages: ${cvData.skills.languages.map(l => `${l.name} (${l.level})`).join(', ')}` : '',
    ].filter(Boolean).join('\n');

    const projectsText = cvData.projects.map(p => 
      `- ${p.name}: ${p.description}${p.url ? ` (${p.url})` : ''}`
    ).join('\n');

    const prompt = `Create a professional, modern, visually stunning CV/Resume image.

CANDIDATE INFORMATION:
Name: ${cvData.personalInfo.fullName}
Title: ${cvData.personalInfo.title}
Email: ${cvData.personalInfo.email}
Phone: ${cvData.personalInfo.phone}
Location: ${cvData.personalInfo.location}
Summary: ${cvData.personalInfo.summary}

EXPERIENCE:
${experienceText || 'No experience listed'}

EDUCATION:
${educationText || 'No education listed'}

SKILLS:
${skillsText || 'No skills listed'}

PROJECTS:
${projectsText || 'No projects listed'}

DESIGN SPECIFICATIONS:
- Style: ${style || colorPresetName} theme
- Primary accent color: ${accentColor}
- Orientation: ${orientation} (A4 paper)
- Font style: ${fontFamily} - clean and professional
- Layout: Modern, clean design with clear sections
- Include subtle design elements, professional icons for sections
- Make it visually impressive but ATS-friendly readable

Generate a complete, professional CV image that looks like a real printed resume. The design should be elegant, modern, and immediately convey professionalism.`;

    console.log("Generating CV image with Gemini...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to generate CV image" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    console.log("CV image generated successfully");

    // Extract image from response - Gemini returns images in message.images array
    const message = result.choices?.[0]?.message;
    let imageUrl = null;

    // Check for images array (Lovable AI format)
    if (message?.images && Array.isArray(message.images) && message.images.length > 0) {
      const firstImage = message.images[0];
      if (firstImage?.image_url?.url) {
        imageUrl = firstImage.image_url.url;
      }
    }
    
    // Fallback: check content array format
    if (!imageUrl && Array.isArray(message?.content)) {
      const imagePart = message.content.find((part: any) => 
        part.type === 'image_url' || part.type === 'image' || part.image_url
      );
      if (imagePart?.image_url?.url) {
        imageUrl = imagePart.image_url.url;
      }
    }

    // Fallback: check if content is a direct URL or base64
    if (!imageUrl && typeof message?.content === 'string') {
      if (message.content.startsWith('data:image') || message.content.startsWith('http')) {
        imageUrl = message.content;
      }
    }

    if (!imageUrl) {
      console.error("No image found in response:", JSON.stringify(result, null, 2));
      return new Response(
        JSON.stringify({ error: "AI did not return an image. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: imageUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("CV generation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
