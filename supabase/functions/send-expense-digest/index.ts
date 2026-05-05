// @ts-nocheck
// Daily / weekly / monthly expense digest. Sends email via Resend + push via send-web-push.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

type Period = "daily" | "weekly" | "monthly";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const url = new URL(req.url);
    const period = (body.period || url.searchParams.get("period") || "daily") as Period;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { from, to, label, prevFrom, prevTo } = computeRange(period);

    // Fetch current period expenses
    const { data: expenses, error } = await admin
      .from("expenses")
      .select("amount, payment_date, category_id, vendor_name, expense_categories(name)")
      .gte("payment_date", from)
      .lte("payment_date", to);
    if (error) throw error;

    // Fetch previous period for comparison
    const { data: prevExp } = await admin
      .from("expenses")
      .select("amount")
      .gte("payment_date", prevFrom)
      .lte("payment_date", prevTo);

    const total = (expenses ?? []).reduce((s, e: any) => s + Number(e.amount), 0);
    const prevTotal = (prevExp ?? []).reduce((s, e: any) => s + Number(e.amount), 0);
    const txnCount = (expenses ?? []).length;
    const delta = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0;

    // Group by category
    const byCat = new Map<string, number>();
    for (const e of expenses ?? []) {
      const name = (e as any).expense_categories?.name || "Uncategorised";
      byCat.set(name, (byCat.get(name) || 0) + Number(e.amount));
    }
    const topCats = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Top vendors
    const byVendor = new Map<string, number>();
    for (const e of expenses ?? []) {
      const v = (e as any).vendor_name || "Unknown";
      byVendor.set(v, (byVendor.get(v) || 0) + Number(e.amount));
    }
    const topVendors = [...byVendor.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Pending review count
    const { count: pendingImports } = await admin
      .from("statement_imports")
      .select("id", { count: "exact", head: true })
      .eq("status", "review");

    const { count: pendingTxns } = await admin
      .from("statement_transactions")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    const html = buildHtml({ label, from, to, total, prevTotal, delta, txnCount, topCats, topVendors, pendingImports: pendingImports ?? 0, pendingTxns: pendingTxns ?? 0 });
    const subject = `Expense ${label}: ₹${formatINR(total)} (${txnCount} txns)`;

    // Find admin recipients with this digest enabled
    const digestCategory = `expense_digest_${period}`;
    const { data: adminRoles } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    const adminIds = (adminRoles ?? []).map((r: any) => r.user_id);

    const { data: settings } = await admin
      .from("notification_settings")
      .select("user_id, enabled, channels")
      .eq("category", digestCategory)
      .in("user_id", adminIds);

    // Default: enabled if no setting row
    const enabledUserIds = new Set(adminIds);
    for (const s of settings ?? []) {
      if (!(s as any).enabled) enabledUserIds.delete((s as any).user_id);
    }

    if (enabledUserIds.size === 0) {
      return json({ ok: true, message: "No recipients enabled", total });
    }

    // Get emails via auth admin
    const recipientEmails: string[] = [];
    for (const uid of enabledUserIds) {
      const { data: u } = await admin.auth.admin.getUserById(uid);
      if (u?.user?.email) recipientEmails.push(u.user.email);
    }

    let emailResult: any = null;
    if (recipientEmails.length > 0 && RESEND_API_KEY) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Dairy Track <onboarding@resend.dev>",
          to: recipientEmails,
          subject,
          html,
        }),
      });
      emailResult = await r.json().catch(() => null);
      if (!r.ok) console.error("Resend error:", emailResult);
    }

    // Push notification
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/send-web-push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
        },
        body: JSON.stringify({
          title: `Expense ${label}`,
          body: `₹${formatINR(total)} across ${txnCount} transactions${pendingTxns ? ` · ${pendingTxns} awaiting review` : ""}`,
          userIds: [...enabledUserIds],
          data: { url: "/expenses" },
        }),
      });
    } catch (e) {
      console.error("Push notify error:", e);
    }

    return json({ ok: true, period, total, txnCount, recipients: recipientEmails.length });
  } catch (err: any) {
    console.error("send-expense-digest error:", err);
    return json({ error: String(err?.message || err) }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function computeRange(period: Period) {
  // IST-based calc; cron runs in UTC but we just compute date ranges
  const nowUtc = new Date();
  const ist = new Date(nowUtc.getTime() + 5.5 * 3600 * 1000);
  const today = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()));
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  if (period === "daily") {
    const yesterday = new Date(today.getTime() - 86400 * 1000);
    const prev = new Date(yesterday.getTime() - 86400 * 1000);
    return { from: fmt(yesterday), to: fmt(yesterday), label: "Daily Digest", prevFrom: fmt(prev), prevTo: fmt(prev) };
  }
  if (period === "weekly") {
    const end = new Date(today.getTime() - 86400 * 1000);
    const start = new Date(end.getTime() - 6 * 86400 * 1000);
    const prevEnd = new Date(start.getTime() - 86400 * 1000);
    const prevStart = new Date(prevEnd.getTime() - 6 * 86400 * 1000);
    return { from: fmt(start), to: fmt(end), label: "Weekly Digest", prevFrom: fmt(prevStart), prevTo: fmt(prevEnd) };
  }
  // monthly: previous calendar month
  const firstOfThisMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const lastOfPrev = new Date(firstOfThisMonth.getTime() - 86400 * 1000);
  const firstOfPrev = new Date(Date.UTC(lastOfPrev.getUTCFullYear(), lastOfPrev.getUTCMonth(), 1));
  const lastOfPrevPrev = new Date(firstOfPrev.getTime() - 86400 * 1000);
  const firstOfPrevPrev = new Date(Date.UTC(lastOfPrevPrev.getUTCFullYear(), lastOfPrevPrev.getUTCMonth(), 1));
  return {
    from: fmt(firstOfPrev),
    to: fmt(lastOfPrev),
    label: `Monthly Digest – ${firstOfPrev.toLocaleString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" })}`,
    prevFrom: fmt(firstOfPrevPrev),
    prevTo: fmt(lastOfPrevPrev),
  };
}

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}

function buildHtml(d: any) {
  const arrow = d.delta > 0 ? "▲" : d.delta < 0 ? "▼" : "→";
  const color = d.delta > 0 ? "#dc2626" : d.delta < 0 ? "#16a34a" : "#6b7280";
  const catRows = d.topCats.map(([n, v]: any) => `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${escapeHtml(n)}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">₹${formatINR(v)}</td></tr>`).join("");
  const venRows = d.topVendors.map(([n, v]: any) => `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${escapeHtml(n)}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">₹${formatINR(v)}</td></tr>`).join("");
  const pendingBlock = d.pendingTxns > 0
    ? `<div style="margin-top:24px;padding:16px;background:#fef3c7;border-radius:8px;border-left:4px solid #f59e0b">
         <strong>📄 ${d.pendingImports} imports awaiting review</strong> (${d.pendingTxns} transactions)<br/>
         <a href="https://udderly-smart-dairy-track.lovable.app/expenses" style="color:#92400e">Review now →</a>
       </div>`
    : "";

  return `<!doctype html><html><body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f9fafb;margin:0;padding:24px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05)">
    <div style="padding:24px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff">
      <h1 style="margin:0;font-size:20px">${escapeHtml(d.label)}</h1>
      <p style="margin:4px 0 0;opacity:0.9;font-size:13px">${d.from === d.to ? d.from : `${d.from} → ${d.to}`}</p>
    </div>
    <div style="padding:24px">
      <div style="display:flex;gap:16px;margin-bottom:24px">
        <div style="flex:1;padding:16px;background:#f3f4f6;border-radius:8px">
          <div style="font-size:12px;color:#6b7280">Total spent</div>
          <div style="font-size:24px;font-weight:700;margin-top:4px">₹${formatINR(d.total)}</div>
          <div style="font-size:12px;color:${color};margin-top:4px">${arrow} ${Math.abs(d.delta).toFixed(1)}% vs prev</div>
        </div>
        <div style="flex:1;padding:16px;background:#f3f4f6;border-radius:8px">
          <div style="font-size:12px;color:#6b7280">Transactions</div>
          <div style="font-size:24px;font-weight:700;margin-top:4px">${d.txnCount}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:4px">Avg ₹${formatINR(d.txnCount ? d.total / d.txnCount : 0)}</div>
        </div>
      </div>
      ${d.topCats.length ? `<h3 style="margin:0 0 8px;font-size:14px;color:#374151">Top categories</h3><table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px">${catRows}</table>` : ""}
      ${d.topVendors.length ? `<h3 style="margin:0 0 8px;font-size:14px;color:#374151">Top vendors</h3><table style="width:100%;border-collapse:collapse;font-size:13px">${venRows}</table>` : ""}
      ${pendingBlock}
    </div>
    <div style="padding:16px 24px;background:#f9fafb;font-size:11px;color:#9ca3af;text-align:center">Udderly Smart Dairy Track</div>
  </div></body></html>`;
}

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
