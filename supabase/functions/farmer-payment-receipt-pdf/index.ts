// Generates a Hindi payment receipt PDF for a single farmer_payment_events row.
// Auth: admin (Authorization bearer) OR farmer JWT (x-farmer-token, only their own).
// Query: ?event_id=<uuid>
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../_shared/cors.ts";
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";
import { NOTO_DEVA_REGULAR_B64, NOTO_DEVA_BOLD_B64 } from "../_shared/notoDevaB64.ts";
import { verifyFarmerJwt } from "../_shared/farmerJwt.ts";

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const fmt = (s: string) => { try { return new Date(s).toLocaleDateString("hi-IN", { day: "2-digit", month: "short", year: "numeric" }); } catch { return s; } };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const eventId = url.searchParams.get('event_id');
    if (!eventId) return new Response(JSON.stringify({ error: 'event_id required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Authorize: admin OR farmer who owns this payout
    const farmerToken = req.headers.get('x-farmer-token');
    const authHeader = req.headers.get('Authorization');
    let allowed = false;
    let farmerScopeId: string | null = null;

    if (farmerToken) {
      const sess = await verifyFarmerJwt(farmerToken);
      if (sess) { allowed = true; farmerScopeId = sess.farmer_id; }
    }
    if (!allowed && authHeader) {
      const { data: u } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      if (u.user) {
        const { data: r } = await supabase.from('user_roles').select('role').eq('user_id', u.user.id).eq('role', 'admin').maybeSingle();
        if (r) allowed = true;
      }
    }
    if (!allowed) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders });

    const { data: ev } = await supabase.from('farmer_payment_events')
      .select('*, farmer_payouts(id, farmer_id, bill_number, net_payable, paid_amount, unpaid_balance, cycle_id, farmer_payout_cycles(cycle_start, cycle_end))')
      .eq('id', eventId).single();
    if (!ev) return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers: corsHeaders });
    const payout = (ev as any).farmer_payouts;
    if (farmerScopeId && payout?.farmer_id !== farmerScopeId) {
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: corsHeaders });
    }

    const { data: f } = await supabase.from('farmers').select('name, farmer_code, phone_number').eq('id', payout.farmer_id).single();
    const { data: orgSetting } = await supabase.from('app_settings').select('value').eq('key', 'organization_settings').maybeSingle();
    const orgName = (orgSetting?.value as any)?.organization_name ?? "Dairy";

    // Build PDF (A6-ish on A5)
    const doc = new jsPDF({ unit: "mm", format: "a5", orientation: "portrait" });
    doc.addFileToVFS("NotoDeva.ttf", NOTO_DEVA_REGULAR_B64);
    doc.addFont("NotoDeva.ttf", "NotoDeva", "normal");
    doc.addFileToVFS("NotoDevaB.ttf", NOTO_DEVA_BOLD_B64);
    doc.addFont("NotoDevaB.ttf", "NotoDeva", "bold");
    doc.setFont("NotoDeva", "normal");

    const W = 148;
    let y = 12;
    doc.setFont("NotoDeva", "bold");
    doc.setFontSize(15);
    doc.text(orgName, W / 2, y, { align: "center" });
    y += 7;
    doc.setFontSize(13);
    doc.text("भुगतान रसीद / Payment Receipt", W / 2, y, { align: "center" });
    y += 9;

    doc.setFont("NotoDeva", "normal");
    doc.setFontSize(9);
    const labelVal = (l: string, v: string) => {
      doc.text(l, 12, y);
      doc.setFont("NotoDeva", "bold");
      doc.text(v, W - 12, y, { align: "right" });
      doc.setFont("NotoDeva", "normal");
      y += 6;
    };

    labelVal("रसीद नं / Receipt #", String(eventId).slice(0, 8).toUpperCase());
    labelVal("दिनांक / Date", fmt(ev.paid_on));
    doc.line(8, y, W - 8, y); y += 5;
    labelVal("किसान / Farmer", `${f?.name ?? ''} (${f?.farmer_code ?? ''})`);
    labelVal("मोबाइल / Mobile", f?.phone_number ?? "—");
    labelVal("बिल नं / Bill #", payout?.bill_number ?? "—");
    if (payout?.farmer_payout_cycles) {
      labelVal("अवधि / Period", `${fmt(payout.farmer_payout_cycles.cycle_start)} – ${fmt(payout.farmer_payout_cycles.cycle_end)}`);
    }
    doc.line(8, y, W - 8, y); y += 5;
    labelVal("तरीका / Method", String(ev.method).toUpperCase());
    if (ev.reference) labelVal("संदर्भ / Reference", ev.reference);
    doc.line(8, y, W - 8, y); y += 6;

    doc.setFont("NotoDeva", "bold");
    doc.setFontSize(13);
    doc.text("राशि / Amount", 12, y);
    doc.text(inr(Number(ev.amount)), W - 12, y, { align: "right" });
    y += 8;

    doc.setFont("NotoDeva", "normal");
    doc.setFontSize(8);
    if (Number(payout?.unpaid_balance) > 0) {
      doc.text(`बाकी / Remaining: ${inr(Number(payout.unpaid_balance))} (अगले बिल में जुड़ेगा)`, W / 2, y, { align: "center" });
      y += 5;
    } else {
      doc.text("बिल पूर्ण भुगतान / Bill fully paid", W / 2, y, { align: "center" });
      y += 5;
    }
    if (ev.note) {
      doc.text(`नोट: ${ev.note}`, 12, y);
      y += 5;
    }

    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text(`Generated ${new Date().toLocaleString("en-IN")}`, W / 2, 200, { align: "center" });

    const bytes = new Uint8Array(doc.output("arraybuffer"));

    // Cache to storage if not already done
    if (!ev.receipt_storage_path) {
      const path = `receipts/${payout.farmer_id}/${eventId}.pdf`;
      const { error: upErr } = await supabase.storage.from('farmer-bills')
        .upload(path, bytes, { contentType: 'application/pdf', upsert: true });
      if (!upErr) {
        await supabase.from('farmer_payment_events').update({ receipt_storage_path: path }).eq('id', eventId);
      }
    }

    return new Response(bytes, {
      headers: { ...corsHeaders, 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="receipt-${eventId.slice(0,8)}.pdf"` },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
