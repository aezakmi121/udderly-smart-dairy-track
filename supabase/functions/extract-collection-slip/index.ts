import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You extract structured data from photos of dairy milk-collection printed slips.
The slip has a header (date, shift M/E/All, MPP code), then per-species sections (Cow, Buff/Buffalo).
Each section has rows with: Code, Qty(Lt), Fat%, SNF%, Amount.
Numbers may have decimal points; preserve exactly. Codes are integers as strings.
Return ALL rows you can read, even if Amount is 0.00 (we will recompute).
Shift values: "M" = morning, "E" = evening, "All" = both sessions.`;

const TOOL = {
  type: "function",
  function: {
    name: "return_slip_data",
    description: "Return the parsed slip in structured JSON.",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "DD-MM-YYYY as printed" },
        shift: { type: "string", enum: ["M", "E", "All"] },
        mpp_code: { type: "string" },
        sections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              species: { type: "string", enum: ["Cow", "Buffalo"] },
              rows: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    code: { type: "string" },
                    qty: { type: "number" },
                    fat: { type: "number" },
                    snf: { type: "number" },
                    printed_amount: { type: "number" },
                  },
                  required: ["code", "qty", "fat", "snf", "printed_amount"],
                  additionalProperties: false,
                },
              },
            },
            required: ["species", "rows"],
            additionalProperties: false,
          },
        },
      },
      required: ["date", "shift", "sections"],
      additionalProperties: false,
    },
  },
};

function parseSlipDate(s: string): string {
  // DD-MM-YYYY -> YYYY-MM-DD
  const m = s.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (!m) return new Date().toISOString().split("T")[0];
  return `${m[3]}-${m[2]}-${m[1]}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // admin only
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const imageDataUrl: string = body.image_data_url;
    const sessionOverride: "morning" | "evening" | undefined =
      body.session_override;
    const dateOverride: string | undefined = body.date_override;

    if (!imageDataUrl || !imageDataUrl.startsWith("data:image/")) {
      return new Response(
        JSON.stringify({ error: "image_data_url required (data:image/...)" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Rough body-size guard: base64 ~1.37x raw. 5MB raw -> ~6.8MB base64 (Functions limit ~6MB).
    const approxBytes = Math.floor((imageDataUrl.length * 3) / 4);
    console.log("extract-slip: image approx bytes", approxBytes);
    if (approxBytes > 5_500_000) {
      return new Response(
        JSON.stringify({
          error:
            "Image too large. Please retake at lower resolution (client should compress to <4MB).",
        }),
        {
          status: 413,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Call Lovable AI Gateway with vision + tool calling.
    // Use flash (free + vision) and tool_choice "required" — Gemini honors this more reliably
    // than the OpenAI-style {type:"function",function:{name:...}} object.
    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extract the slip data. Include every row from every species section. Call return_slip_data with the result.",
                },
                { type: "image_url", image_url: { url: imageDataUrl } },
              ],
            },
          ],
          tools: [TOOL],
          tool_choice: "required",
        }),
      },
    );

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI rate limit hit. Try again shortly." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({
            error:
              "AI credits exhausted. Add funds in Lovable Workspace settings.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      return new Response(
        JSON.stringify({ error: "AI extraction failed", status: aiResp.status, detail: t.slice(0, 500) }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const aiJson = await aiResp.json();
    const msg = aiJson.choices?.[0]?.message;
    let toolArgs: string | undefined = msg?.tool_calls?.[0]?.function?.arguments;

    // Fallback: some models put JSON in content instead of tool_calls
    if (!toolArgs && typeof msg?.content === "string") {
      const c = msg.content.trim();
      const jsonStart = c.indexOf("{");
      const jsonEnd = c.lastIndexOf("}");
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        toolArgs = c.slice(jsonStart, jsonEnd + 1);
      }
    }

    if (!toolArgs) {
      console.error("extract-slip: no structured output", JSON.stringify(aiJson).slice(0, 800));
      return new Response(
        JSON.stringify({
          error: "AI did not return structured output",
          finish_reason: aiJson.choices?.[0]?.finish_reason,
          content_preview: typeof msg?.content === "string" ? msg.content.slice(0, 300) : null,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let parsed: any;
    try {
      parsed = JSON.parse(toolArgs);
    } catch (e) {
      console.error("extract-slip: JSON parse failed", toolArgs.slice(0, 500));
      return new Response(
        JSON.stringify({ error: "AI returned invalid JSON", preview: toolArgs.slice(0, 300) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Resolve date and session
    const collection_date =
      dateOverride || (parsed.date ? parseSlipDate(parsed.date) : new Date().toISOString().split("T")[0]);

    let session: "morning" | "evening" | "all" = "all";
    if (sessionOverride) session = sessionOverride;
    else if (parsed.shift === "M") session = "morning";
    else if (parsed.shift === "E") session = "evening";

    // Load farmers for code -> id mapping
    const { data: farmers } = await supabase
      .from("farmers")
      .select("id, farmer_code, name")
      .eq("is_active", true);

    const farmerMap = new Map<string, { id: string; name: string }>();
    (farmers || []).forEach((f: any) =>
      farmerMap.set(String(f.farmer_code).trim(), { id: f.id, name: f.name }),
    );

    // Resolve rate per row via fn_get_rate
    const enrichedSections = [];
    for (const sec of parsed.sections || []) {
      const enrichedRows = [];
      for (const r of sec.rows || []) {
        const fmatch = farmerMap.get(String(r.code).trim());
        const { data: rateRows } = await supabase.rpc("fn_get_rate", {
          p_species: sec.species,
          p_fat: r.fat,
          p_snf: r.snf,
          p_date: collection_date,
        });
        const rateRow: any = rateRows && rateRows[0] ? rateRows[0] : null;
        const rate = rateRow?.rate ?? 0;
        const computed_amount = Number((r.qty * Number(rate)).toFixed(2));
        const printed_amount = Number(r.printed_amount || 0);
        enrichedRows.push({
          code: String(r.code),
          farmer_id: fmatch?.id ?? null,
          farmer_name: fmatch?.name ?? null,
          qty: r.qty,
          fat: r.fat,
          snf: r.snf,
          rate,
          rate_source: rateRow?.source ?? "none",
          computed_amount,
          printed_amount,
          discrepancy: Math.abs(computed_amount - printed_amount) > 1,
        });
      }
      enrichedSections.push({ species: sec.species, rows: enrichedRows });
    }

    return new Response(
      JSON.stringify({
        success: true,
        collection_date,
        session,
        mpp_code: parsed.mpp_code ?? null,
        sections: enrichedSections,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("extract-collection-slip error", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
