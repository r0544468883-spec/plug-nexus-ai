import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, cvData, style } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Generating CV HTML design with Gemini...");

    const systemPrompt = `You are a professional CV/resume designer. Generate ONLY valid HTML code for a printable A4 resume.

RULES:
1. Return ONLY the HTML code starting with <!DOCTYPE html> and ending with </html>
2. Include all CSS inline or in a <style> tag in the <head>
3. Use modern, clean design with proper typography
4. Ensure good contrast and readability (dark text on light background)
5. Support both LTR and RTL text using dir="auto" where needed
6. Make it printer-friendly with reasonable margins (20mm)
7. Use semantic HTML structure (header, main, section, etc.)
8. Do NOT include any markdown, explanations, or code blocks - ONLY pure HTML
9. The page should be A4 size (210mm x 297mm)
10. Use a professional color scheme based on the user's preferences`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
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
        JSON.stringify({ error: "Failed to generate CV design" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    console.log("CV design generated successfully");

    // Extract HTML from response
    const content = result.choices?.[0]?.message?.content || "";
    
    // Clean up the response - remove any markdown code blocks if present
    let html = content;
    
    // Remove markdown code blocks if present
    if (html.includes("```html")) {
      html = html.replace(/```html\n?/g, "").replace(/```\n?/g, "");
    } else if (html.includes("```")) {
      html = html.replace(/```\n?/g, "");
    }
    
    // Trim whitespace
    html = html.trim();
    
    // Validate that we got HTML
    if (!html.includes("<!DOCTYPE") && !html.includes("<html")) {
      console.error("Response doesn't contain valid HTML:", html.substring(0, 200));
      return new Response(
        JSON.stringify({ error: "AI did not return valid HTML. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        html: html,
        css: "", // CSS is inline in the HTML
        metadata: { style: style || "professional" },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("CV design generation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
