// Native Web Push sender using VAPID. Replaces send-onesignal-notification.
// Accepts: { title, body, data?, userId?, userIds?, broadcast? }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush@^0.3.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Convert raw URL-safe base64 VAPID keys to a JWK pair the @negrel/webpush
// library expects via importVapidKeys.
function b64urlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
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
  const pub = Deno.env.get("VAPID_PUBLIC_KEY");
  const priv = Deno.env.get("VAPID_PRIVATE_KEY");
  const subject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com";
  if (!pub || !priv) throw new Error("VAPID keys not configured");

  // Build JWK pair from raw bytes.
  const pubBytes = b64urlToBytes(pub); // 65 bytes: 0x04 || X(32) || Y(32)
  if (pubBytes.length !== 65 || pubBytes[0] !== 0x04) {
    throw new Error("VAPID_PUBLIC_KEY must be uncompressed P-256 (65 bytes)");
  }
  const x = bytesToB64url(pubBytes.slice(1, 33));
  const y = bytesToB64url(pubBytes.slice(33, 65));
  const d = priv; // already URL-safe base64

  const publicJwk: JsonWebKey = { kty: "EC", crv: "P-256", x, y, ext: true };
  const privateJwk: JsonWebKey = { kty: "EC", crv: "P-256", x, y, d, ext: true };

  const vapidKeys = await webpush.importVapidKeys(
    { publicKey: publicJwk, privateKey: privateJwk },
    { extractable: false },
  );

  return await webpush.ApplicationServer.new({
    contactInformation: subject,
    vapidKeys,
  });
}

interface SubRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { title, body: msg, data, userId, userIds, broadcast } = body as {
      title?: string;
      body?: string;
      data?: Record<string, unknown>;
      userId?: string;
      userIds?: string[];
      broadcast?: boolean;
    };

    if (!title || !msg) {
      return new Response(JSON.stringify({ error: "title and body are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolve target subscription rows
    let query = supabase.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth");
    const targetUserIds: string[] = [];
    if (broadcast) {
      // no filter
    } else if (Array.isArray(userIds) && userIds.length > 0) {
      query = query.in("user_id", userIds);
      targetUserIds.push(...userIds);
    } else if (userId) {
      query = query.eq("user_id", userId);
      targetUserIds.push(userId);
    } else {
      return new Response(JSON.stringify({ error: "userId, userIds, or broadcast required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: subs, error: subErr } = await query;
    if (subErr) throw subErr;

    const subscriptions = (subs || []) as SubRow[];

    if (subscriptions.length === 0) {
      // Still log to history so admins can see "no devices" state
      if (targetUserIds.length > 0) {
        await supabase.from("notification_history").insert(
          targetUserIds.map((uid) => ({
            user_id: uid,
            notification_id: crypto.randomUUID(),
            title,
            message: msg,
            type: (data as any)?.type || "push",
            priority: (data as any)?.priority || "medium",
            status: "no_device",
          })),
        );
      }
      return new Response(
        JSON.stringify({ success: true, recipients: 0, sent: 0, failed: 0, reason: "no subscriptions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const appServer = await loadAppServer();

    const payload = JSON.stringify({ title, body: msg, data: data || {} });

    let sent = 0;
    let failed = 0;
    const expiredIds: string[] = [];

    await Promise.all(
      subscriptions.map(async (sub) => {
        const subscriber = appServer.subscribe({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        } as any);
        try {
          await subscriber.pushTextMessage(payload, {});
          sent++;
        } catch (err: any) {
          failed++;
          const status = err?.response?.status ?? err?.status;
          // 404/410 — subscription is dead, prune it
          if (status === 404 || status === 410) {
            expiredIds.push(sub.id);
          }
          console.error("[send-web-push] failed", sub.endpoint.slice(0, 50), status, err?.message);
        }
      }),
    );

    if (expiredIds.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", expiredIds);
    }

    // Log to notification_history (one row per target user)
    const uniqueUserIds = Array.from(new Set(subscriptions.map((s) => s.user_id)));
    if (uniqueUserIds.length > 0) {
      await supabase.from("notification_history").insert(
        uniqueUserIds.map((uid) => ({
          user_id: uid,
          notification_id: crypto.randomUUID(),
          title,
          message: msg,
          type: (data as any)?.type || "push",
          priority: (data as any)?.priority || "medium",
          status: sent > 0 ? "sent" : "failed",
        })),
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        recipients: sent,
        sent,
        failed,
        pruned: expiredIds.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("send-web-push error", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
