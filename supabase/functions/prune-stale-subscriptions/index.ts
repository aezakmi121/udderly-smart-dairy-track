// Daily pruning of dead Web Push subscriptions.
// Sends an empty data-only push to each subscription; removes any that 404/410.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush@^0.3.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function b64urlToBytes(b: string): Uint8Array {
  const s = b.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function loadAppServer() {
  const pub = Deno.env.get("VAPID_PUBLIC_KEY")!;
  const priv = Deno.env.get("VAPID_PRIVATE_KEY")!;
  const subject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com";
  const pubBytes = b64urlToBytes(pub);
  const x = bytesToB64url(pubBytes.slice(1, 33));
  const y = bytesToB64url(pubBytes.slice(33, 65));
  const publicJwk: JsonWebKey = { kty: "EC", crv: "P-256", x, y, ext: true };
  const privateJwk: JsonWebKey = { kty: "EC", crv: "P-256", x, y, d: priv, ext: true };
  const vapidKeys = await webpush.importVapidKeys(
    { publicKey: publicJwk, privateKey: privateJwk },
    { extractable: false },
  );
  return await webpush.ApplicationServer.new({ contactInformation: subject, vapidKeys });
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth");

    const all = (subs || []) as any[];
    if (all.length === 0) {
      return new Response(JSON.stringify({ success: true, checked: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const appServer = await loadAppServer();
    const expired: string[] = [];
    let alive = 0;

    await Promise.all(all.map(async (s) => {
      const subscriber = appServer.subscribe({
        endpoint: s.endpoint,
        keys: { p256dh: s.p256dh, auth: s.auth },
      } as any);
      try {
        // Send a near-silent ping. Browsers require userVisibleOnly so we must show
        // something — use a quick ping payload that the SW dedupes via tag.
        await subscriber.pushTextMessage(
          JSON.stringify({ title: "🔧", body: "", data: { type: "health_ping", silent: true, tag: "health_ping" } }),
          {},
        );
        alive++;
      } catch (err: any) {
        const status = err?.response?.status ?? err?.status;
        if (status === 404 || status === 410) {
          expired.push(s.id);
          await supabase.from("notification_events").insert({
            user_id: s.user_id,
            subscription_endpoint_hash: await sha256Hex(s.endpoint),
            event_type: "subscription_expired",
            source: "prune-stale-subscriptions",
            status: "pruned",
            error_code: status,
          });
        }
      }
    }));

    if (expired.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", expired);
    }

    return new Response(
      JSON.stringify({ success: true, checked: all.length, alive, pruned: expired.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("prune-stale-subscriptions error", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
