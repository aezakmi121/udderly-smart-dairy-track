import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Sends a web-push summary to admin/worker staff after a milk-collection
// session is saved (e.g. from the slip scanner). send-web-push logs the
// notification to notification_history automatically.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      collection_date,
      session,
      total_quantity = 0,
      total_amount = 0,
      farmer_count = 0,
      source = "slip-scan",
    } = await req.json();

    if (!collection_date || !session) {
      return json({ error: "collection_date and session required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const qty = Number(total_quantity) || 0;
    const amount = Number(total_amount) || 0;
    const farmers = Number(farmer_count) || 0;
    const sessionLabel = session === "morning"
      ? "Morning"
      : session === "evening"
      ? "Evening"
      : "Day";

    const title = `🥛 ${sessionLabel} collection saved`;
    const body = `${farmers} farmer${farmers === 1 ? "" : "s"} · ${qty.toFixed(1)} L · ₹${
      amount.toFixed(0)
    } — ${collection_date}`;

    const { data: roles } = await supabase
      .from("user_roles").select("user_id").in("role", ["admin", "worker"]);
    const userIds = Array.from(
      new Set((roles || []).map((r: { user_id: string }) => r.user_id)),
    );

    if (userIds.length === 0) return json({ success: true, recipients: 0 });

    const { data: resp, error } = await supabase.functions.invoke("send-web-push", {
      body: {
        title,
        body,
        userIds,
        data: {
          type: "collection_summary",
          session,
          collection_date,
          source,
          priority: "medium",
        },
      },
    });
    if (error) return json({ error: error.message }, 500);

    return json({ success: true, recipients: resp?.sent ?? 0 });
  } catch (error) {
    console.error("notify-collection-summary error", error);
    return json({ error: (error as Error).message }, 500);
  }
});
