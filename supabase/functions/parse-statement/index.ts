// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Unauthorized" }, 401);
  }

  // user-scoped client to verify role
  const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: roleRow } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleRow) return json({ error: "Admin only" }, 403);

  let importId: string | null = null;
  try {
    const contentType = req.headers.get("content-type") || "";
    let file: File | null = null;
    let bankAccountId: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      file = form.get("file") as File | null;
      bankAccountId = form.get("bank_account_id") as string | null;
      if (!file || !bankAccountId) return json({ error: "file and bank_account_id required" }, 400);

      const buf = new Uint8Array(await file.arrayBuffer());
      const path = `${userData.user.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await admin.storage.from("bank-statements").upload(path, buf, {
        contentType: "application/pdf",
        upsert: false,
      });
      if (upErr) throw new Error("Upload failed: " + upErr.message);

      const { data: imp, error: impErr } = await admin
        .from("statement_imports")
        .insert({
          bank_account_id: bankAccountId,
          file_url: path,
          status: "uploaded",
          uploaded_by: userData.user.id,
          error_message: null,
        })
        .select()
        .single();
      if (impErr) throw impErr;
      importId = imp.id;
    } else {
      const body = await req.json().catch(() => null);
      importId = body?.import_id ?? null;
      if (!importId) return json({ error: "import_id required" }, 400);

      const { data: imp, error: impErr } = await admin
        .from("statement_imports")
        .select("id, bank_account_id, file_url")
        .eq("id", importId)
        .single();
      if (impErr || !imp) return json({ error: "Statement import not found" }, 404);

      bankAccountId = imp.bank_account_id;
      const { data: fileData, error: downloadErr } = await admin.storage.from("bank-statements").download(imp.file_url);
      if (downloadErr || !fileData) throw new Error("Could not read uploaded statement file");
      file = new File([await fileData.arrayBuffer()], imp.file_url.split("/").pop() || "statement.pdf", {
        type: "application/pdf",
      });
    }

    // Validate bank account
    const { data: bankAcct } = await admin
      .from("bank_accounts")
      .select("id, name")
      .eq("id", bankAccountId)
      .single();
    if (!bankAcct) return json({ error: "Bank account not found" }, 404);

    await admin
      .from("statement_imports")
      .update({ status: "parsing", error_message: null })
      .eq("id", importId);

    const buf = new Uint8Array(await file.arrayBuffer());

    // Extract text from PDF
    const pdf = await getDocumentProxy(buf);
    const { text } = await extractText(pdf, { mergePages: true });
    if (!text || text.length < 50) throw new Error("Could not extract text from PDF");

    await admin
      .from("statement_imports")
      .update({ status: "extracted" })
      .eq("id", importId);

    // Load reference data for AI
    const [{ data: cats }, { data: pms }] = await Promise.all([
      admin.from("expense_categories").select("id, name").eq("is_active", true),
      admin.from("payment_methods").select("id, name").eq("is_active", true),
    ]);

    const categoryList = (cats ?? []).map((c) => `${c.name} [${c.id}]`).join("\n");
    const pmList = (pms ?? []).map((p) => `${p.name} [${p.id}]`).join("\n");

    // Truncate very long text to avoid token blowups
    const safeText = text.length > 60000 ? text.slice(0, 60000) : text;

    const tools = [
      {
        type: "function",
        function: {
          name: "extract_debit_transactions",
          description:
            "Extract all DEBIT (withdrawal) rows from the bank statement. Skip credits, deposits, balance lines, headers, and reversals. For each row, also pick the best category and payment method.",
          parameters: {
            type: "object",
            properties: {
              period_from: { type: "string", description: "Statement period start YYYY-MM-DD or empty" },
              period_to: { type: "string", description: "Statement period end YYYY-MM-DD or empty" },
              transactions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    txn_date: { type: "string", description: "YYYY-MM-DD" },
                    narration: { type: "string" },
                    ref_no: { type: "string", description: "Cheque/UTR/ref number or empty" },
                    amount: { type: "number", description: "Debit amount, positive number" },
                    suggested_category_id: { type: "string", description: "UUID from the provided categories list, or empty if no good match" },
                    suggested_payment_method_id: { type: "string", description: "UUID from the provided payment methods list, or empty" },
                    suggested_vendor: { type: "string", description: "Cleaned merchant/vendor name" },
                    confidence: { type: "number", description: "0..1 confidence in the categorisation" },
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
      },
    ];

    const systemPrompt = `You parse Indian bank statements (HDFC, ICICI, SBI, Axis, etc.) and extract DEBIT transactions only.

Available expense categories (use exact UUID):
${categoryList}

Available payment methods (use exact UUID):
${pmList}

Rules:
- Only DEBIT/withdrawal rows. Skip credits, deposits, opening/closing balance, interest credits, reversals.
- Map narrations to the best-matching category UUID from the list. If no good match, leave empty.
- Detect payment method from narration (UPI/IMPS/NEFT/RTGS/POS/CHQ/ATM) and match to provided list.
- Clean vendor name: extract the actual merchant from UPI handles like "UPI/12345/SWIGGY/..." → "Swiggy".
- Set confidence: 0.95+ for obvious matches, 0.7-0.9 for reasonable, <0.7 for guesses.
- Return ONLY UUIDs that appear in the lists above. Never invent UUIDs.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Extract all debit transactions from this bank statement:\n\n${safeText}` },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "extract_debit_transactions" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) throw new Error("AI rate limit exceeded, please try again in a minute");
      if (aiResp.status === 402) throw new Error("Lovable AI credits exhausted. Add credits in Settings → Workspace → Usage.");
      const t = await aiResp.text();
      throw new Error("AI gateway error: " + t.slice(0, 300));
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured output");
    const parsed = JSON.parse(toolCall.function.arguments);
    const txns: any[] = parsed.transactions ?? [];

    await admin
      .from("statement_imports")
      .update({ status: "categorized" })
      .eq("id", importId);

    if (txns.length === 0) {
      await admin.from("statement_imports").update({
        status: "review",
        txn_count: 0,
        total_debits: 0,
        period_from: parsed.period_from || null,
        period_to: parsed.period_to || null,
      }).eq("id", importId);
      return json({ import_id: importId, txn_count: 0, message: "No debit transactions found" });
    }

    // Validate UUIDs against known sets
    const catSet = new Set((cats ?? []).map((c: any) => c.id));
    const pmSet = new Set((pms ?? []).map((p: any) => p.id));

    const rows = txns
      .filter((t) => t.amount > 0 && t.txn_date && t.narration)
      .map((t) => ({
        import_id: importId!,
        bank_account_id: bankAccountId,
        txn_date: t.txn_date,
        narration: String(t.narration).slice(0, 1000),
        ref_no: t.ref_no || null,
        amount: Number(t.amount),
        suggested_category_id: t.suggested_category_id && catSet.has(t.suggested_category_id) ? t.suggested_category_id : null,
        suggested_payment_method_id: t.suggested_payment_method_id && pmSet.has(t.suggested_payment_method_id) ? t.suggested_payment_method_id : null,
        suggested_vendor: t.suggested_vendor || null,
        confidence: Math.max(0, Math.min(1, Number(t.confidence) || 0)),
        status: "pending",
      }));

    // Pre-dedup against existing rows for this bank account (partial unique index can't be used with ON CONFLICT)
    let inserted = 0;
    if (rows.length > 0) {
      const refNos = rows.map((r) => r.ref_no).filter((v): v is string => !!v);
      const existing = new Set<string>();
      if (refNos.length > 0) {
        const { data: dup } = await admin
          .from("statement_transactions")
          .select("ref_no")
            .eq("bank_account_id", bankAccountId)
          .in("ref_no", refNos);
        for (const d of dup || []) if (d.ref_no) existing.add(d.ref_no);
      }
      const toInsert = rows.filter((r) => !r.ref_no || !existing.has(r.ref_no));
      for (const chunk of chunked(toInsert, 100)) {
        const { error } = await admin.from("statement_transactions").insert(chunk);
        if (!error) inserted += chunk.length;
        else console.error("Insert chunk error:", error);
      }
    }

    const totalDebits = rows.reduce((s, r) => s + r.amount, 0);

    await admin.from("statement_imports").update({
      status: "review",
      txn_count: inserted,
      total_debits: totalDebits,
      period_from: parsed.period_from || rows[0]?.txn_date || null,
      period_to: parsed.period_to || rows[rows.length - 1]?.txn_date || null,
    }).eq("id", importId);

    return json({ import_id: importId, txn_count: inserted, total_debits: totalDebits });
  } catch (err: any) {
    console.error("parse-statement error:", err);
    if (importId) {
      const message = String(err?.message || err).slice(0, 500);
      const failureStatus = message.includes("extract")
        ? "failed_extracted"
        : message.includes("AI") || message.includes("Lovable AI")
          ? "failed_categorized"
          : "failed";
      await createClient(SUPABASE_URL, SERVICE_KEY)
        .from("statement_imports")
        .update({ status: failureStatus, error_message: message })
        .eq("id", importId);
    }
    return json({ error: String(err?.message || err) }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function chunked<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
