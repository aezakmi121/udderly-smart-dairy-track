// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

interface DebitRow {
  txn_date: string; // YYYY-MM-DD
  narration: string;
  ref_no: string | null;
  amount: number;
  category_id?: string | null;
  payment_method_id?: string | null;
  vendor_name?: string | null;
  confidence?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: roleRow } = await admin
    .from("user_roles").select("role")
    .eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
  if (!roleRow) return json({ error: "Admin only" }, 403);

  let importId: string | null = null;
  try {
    const body = await req.json().catch(() => null);
    importId = body?.import_id ?? null;
    if (!importId) return json({ error: "import_id required" }, 400);

    const { data: imp, error: impErr } = await admin
      .from("statement_imports")
      .select("id, bank_account_id, file_url")
      .eq("id", importId).single();
    if (impErr || !imp) return json({ error: "Statement import not found" }, 404);

    const bankAccountId = imp.bank_account_id;
    const { data: fileData, error: dlErr } = await admin.storage.from("bank-statements").download(imp.file_url);
    if (dlErr || !fileData) throw new Error("Could not read uploaded statement file");
    const pdfBuf = new Uint8Array(await fileData.arrayBuffer());

    await admin.from("statement_imports").update({ status: "parsing", error_message: null }).eq("id", importId);

    // Stage 1: load category + payment method dictionaries
    const [{ data: cats }, { data: pms }] = await Promise.all([
      admin.from("expense_categories").select("id, name").eq("is_active", true),
      admin.from("payment_methods").select("id, name").eq("is_active", true),
    ]);
    const catSet = new Set((cats ?? []).map((c: any) => c.id));
    const pmSet = new Set((pms ?? []).map((p: any) => p.id));
    const categoryList = (cats ?? []).map((c: any) => `${c.name} [${c.id}]`).join("\n");
    const pmList = (pms ?? []).map((p: any) => `${p.name} [${p.id}]`).join("\n");

    await admin.from("statement_imports").update({ status: "extracted" }).eq("id", importId);

    // Stage 2: send PDF directly to Gemini 2.5 Pro (multimodal)
    const debitRows = await extractWithGemini(pdfBuf, categoryList, pmList);
    console.log(`Gemini extracted ${debitRows.length} debit rows.`);

    await admin.from("statement_imports").update({ status: "categorized" }).eq("id", importId);

    if (debitRows.length === 0) {
      await admin.from("statement_imports").update({
        status: "review", txn_count: 0, total_debits: 0,
      }).eq("id", importId);
      return json({ import_id: importId, txn_count: 0, message: "No debit rows detected." });
    }

    const rows = debitRows.map((r) => ({
      import_id: importId!,
      bank_account_id: bankAccountId,
      txn_date: r.txn_date,
      narration: (r.narration || "").slice(0, 1000),
      ref_no: r.ref_no || null,
      amount: r.amount,
      payment_period: `${r.txn_date.slice(0, 7)}-01`,
      suggested_category_id: r.category_id && catSet.has(r.category_id) ? r.category_id : null,
      suggested_payment_method_id: r.payment_method_id && pmSet.has(r.payment_method_id) ? r.payment_method_id : null,
      suggested_vendor: r.vendor_name || null,
      confidence: Math.max(0, Math.min(1, Number(r.confidence) || 0.5)),
      status: "pending",
    }));

    // Dedup
    let inserted = 0;
    const refNos = rows.map((r) => r.ref_no).filter((v): v is string => !!v);
    const existing = new Set<string>();
    if (refNos.length) {
      const { data: dup } = await admin
        .from("statement_transactions").select("ref_no")
        .eq("bank_account_id", bankAccountId).in("ref_no", refNos);
      for (const d of dup || []) if (d.ref_no) existing.add(d.ref_no);
    }
    const toInsert = rows.filter((r) => !r.ref_no || !existing.has(r.ref_no));
    for (let i = 0; i < toInsert.length; i += 100) {
      const chunk = toInsert.slice(i, i + 100);
      const { error } = await admin.from("statement_transactions").insert(chunk);
      if (!error) inserted += chunk.length;
      else console.error("Insert error:", error);
    }

    const totalDebits = rows.reduce((s, r) => s + r.amount, 0);
    const dates = rows.map((r) => r.txn_date).sort();

    await admin.from("statement_imports").update({
      status: "review",
      txn_count: inserted,
      total_debits: totalDebits,
      period_from: dates[0] || null,
      period_to: dates[dates.length - 1] || null,
    }).eq("id", importId);

    return json({ import_id: importId, txn_count: inserted, total_debits: totalDebits });
  } catch (err: any) {
    console.error("parse-statement error:", err);
    if (importId) {
      const message = String(err?.message || err).slice(0, 500);
      const status = message.toLowerCase().includes("ai") || message.toLowerCase().includes("gateway")
        ? "failed_categorized" : "failed_extracted";
      await createClient(SUPABASE_URL, SERVICE_KEY)
        .from("statement_imports")
        .update({ status, error_message: message }).eq("id", importId);
    }
    return json({ error: String(err?.message || err) }, 500);
  }
});

// ─────────────────────────────────────────────────────────────
// Gemini 2.5 Pro multimodal: PDF → debit rows + categorisation
// ─────────────────────────────────────────────────────────────
async function extractWithGemini(pdfBuf: Uint8Array, categoryList: string, pmList: string): Promise<DebitRow[]> {
  const base64 = bufToBase64(pdfBuf);

  const tools = [{
    type: "function",
    function: {
      name: "return_debit_transactions",
      description: "Return all DEBIT transactions (money leaving account) from this Indian bank statement PDF.",
      parameters: {
        type: "object",
        properties: {
          transactions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                txn_date: { type: "string", description: "ISO date YYYY-MM-DD" },
                narration: { type: "string", description: "Full narration / description text from the statement, joined onto one line" },
                ref_no: { type: "string", description: "Cheque or reference number, empty string if none" },
                amount: { type: "number", description: "Withdrawal amount in rupees, positive number" },
                category_id: { type: "string", description: "UUID from category list, empty string if no good match" },
                payment_method_id: { type: "string", description: "UUID from payment method list, empty string if none" },
                vendor_name: { type: "string", description: "Cleaned vendor name (e.g. UPI-SWIGGY-... → Swiggy)" },
                confidence: { type: "number", description: "0-1 confidence in category/payment_method/vendor" },
              },
              required: ["txn_date", "narration", "amount", "confidence"],
              additionalProperties: false,
            },
          },
        },
        required: ["transactions"],
        additionalProperties: false,
      },
    },
  }];

  const systemPrompt = `You extract DEBIT transactions from Indian bank statement PDFs (HDFC, ICICI, SBI, Axis, etc.).

CRITICAL RULES:
1. Return ONLY debits — money leaving the account. A debit has a value in the Withdrawal/Debit column. SKIP any row with a value in the Deposit/Credit column.
2. NEVER infer debit/credit from narration text or sign — use the column position only.
3. Skip opening/closing balance lines, sub-totals, page headers, and "Statement Summary" rows.
4. The narration is often the LONGEST piece of text on a row, may span multiple lines, and typically starts with prefixes like UPI-, NEFT-, IMPS-, POS, ATW, CHQ, etc. Join multi-line narration into one string.

CATEGORISATION:
Categories (return exact UUID, or empty string):
${categoryList}

Payment methods (return exact UUID, or empty string):
${pmList}

Payment method hints from narration prefix:
- UPI- / UPI/ → UPI
- NEFT → NEFT
- IMPS → IMPS
- RTGS → RTGS
- POS / VPS → Card
- ATW / NWD / ATM → ATM
- CHQ / CHEQUE → Cheque

Vendor: extract real merchant from UPI handles, e.g. "UPI-SWIGGY LIMITED-swiggy@axisbank-..." → "Swiggy". Strip @handles, numeric IDs, bank codes.

Confidence: 0.95+ obvious, 0.7-0.9 reasonable, <0.7 guess. Return ONLY UUIDs from the lists above.`;

  const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract every debit transaction from this statement. Return them in chronological order." },
            { type: "file", file: { filename: "statement.pdf", file_data: `data:application/pdf;base64,${base64}` } },
          ],
        },
      ],
      tools,
      tool_choice: { type: "function", function: { name: "return_debit_transactions" } },
    }),
  });

  if (!aiResp.ok) {
    const t = await aiResp.text();
    if (aiResp.status === 429) throw new Error("AI rate limit exceeded, please try again in a minute");
    if (aiResp.status === 402) throw new Error("Lovable AI credits exhausted. Add credits in Settings → Workspace → Usage.");
    throw new Error("AI gateway error: " + t.slice(0, 500));
  }
  const aiJson = await aiResp.json();
  const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("AI did not return any transactions");
  const parsed = JSON.parse(toolCall.function.arguments);
  const txns: any[] = parsed.transactions ?? [];

  return txns
    .filter((t) => t && t.txn_date && Number.isFinite(Number(t.amount)) && Number(t.amount) > 0)
    .map((t) => ({
      txn_date: String(t.txn_date).slice(0, 10),
      narration: String(t.narration || "").trim(),
      ref_no: t.ref_no ? String(t.ref_no).trim() : null,
      amount: Number(t.amount),
      category_id: t.category_id || null,
      payment_method_id: t.payment_method_id || null,
      vendor_name: t.vendor_name || null,
      confidence: Number(t.confidence) || 0.5,
    }));
}

function bufToBase64(buf: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    bin += String.fromCharCode.apply(null, buf.subarray(i, i + chunk) as any);
  }
  return btoa(bin);
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
