// Public endpoint called by the service worker to log push lifecycle events
// (sw_received, sw_displayed, sw_clicked). No auth required — uses endpoint
// hash for correlation, never trusts user_id from the body.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED = new Set([
  "sw_received",
  "sw_displayed",
  "sw_clicked",
  "permission_revoked",
]);

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const { event_type, payload_tag, endpoint, meta } = body as {
      event_type?: string;
      payload_tag?: string;
      endpoint?: string;
      meta?: Record<string, unknown>;
    };
    if (!event_type || !ALLOWED.has(event_type)) {
      return new Response(JSON.stringify({ error: "invalid event_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let userId: string | null = null;
    let endpointHash: string | null = null;
    if (endpoint) {
      endpointHash = await sha256Hex(endpoint);
      const { data: row } = await supabase
        .from("push_subscriptions")
        .select("user_id")
        .eq("endpoint", endpoint)
        .maybeSingle();
      userId = (row as any)?.user_id ?? null;
    }

    await supabase.from("notification_events").insert({
      user_id: userId,
      subscription_endpoint_hash: endpointHash,
      event_type,
      payload_tag: payload_tag ?? null,
      source: "service-worker",
      status: "logged",
      meta: meta ?? null,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
