// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
// unpdf bundles pdfjs without the `canvas` native dep — perfect for Deno edge.
import { getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

// ─────────────────────────────────────────────────────────────
// Types for positional extraction
// ─────────────────────────────────────────────────────────────
interface PdfTextItem {
  str: string;
  x: number;
  y: number;
  page: number;
}

interface ColumnLayout {
  date: number;       // x of "Date" header (left edge)
  narration: number;
  ref: number | null;
  withdrawal: number;
  deposit: number;
  balance: number;
  // right edges (next column's x), used to bucket items
  dateEnd: number;
  narrationEnd: number;
  refEnd: number;
  withdrawalEnd: number;
  depositEnd: number;
}

interface DebitRow {
  txn_date: string;       // YYYY-MM-DD
  narration: string;
  ref_no: string | null;
  amount: number;
  balance: number | null;
  balance_check_passed: boolean;
}

// ─────────────────────────────────────────────────────────────
// Entry
// ─────────────────────────────────────────────────────────────
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

    const { data: bankAcct } = await admin
      .from("bank_accounts")
      .select("id, name")
      .eq("id", bankAccountId)
      .single();
    if (!bankAcct) return json({ error: "Bank account not found" }, 404);

    await admin.from("statement_imports").update({ status: "parsing", error_message: null }).eq("id", importId);

    // ─────────────────────────────────────────────────────────
    // STAGE 1 — deterministic column extraction (no AI)
    // ─────────────────────────────────────────────────────────
    const buf = new Uint8Array(await file.arrayBuffer());
    let items: PdfTextItem[];
    try {
      items = await extractPositionalText(buf);
    } catch (e) {
      throw new Error("Could not read PDF: " + (e as Error).message);
    }
    if (!items.length) throw new Error("PDF appears to be empty or scanned (image-only). OCR is not supported.");

    const debitRows = extractDebitRows(items);
    console.log(`Stage 1 extracted ${debitRows.length} debit rows from ${items.length} text items.`);

    await admin.from("statement_imports").update({ status: "extracted" }).eq("id", importId);

    if (debitRows.length === 0) {
      await admin.from("statement_imports").update({
        status: "review",
        txn_count: 0,
        total_debits: 0,
      }).eq("id", importId);
      return json({ import_id: importId, txn_count: 0, message: "No debit rows detected. The PDF format may not be supported yet." });
    }

    // ─────────────────────────────────────────────────────────
    // STAGE 2 — AI categorisation only (debit/credit already locked)
    // ─────────────────────────────────────────────────────────
    const [{ data: cats }, { data: pms }] = await Promise.all([
      admin.from("expense_categories").select("id, name").eq("is_active", true),
      admin.from("payment_methods").select("id, name").eq("is_active", true),
    ]);

    const catSet = new Set((cats ?? []).map((c: any) => c.id));
    const pmSet = new Set((pms ?? []).map((p: any) => p.id));

    const categoryList = (cats ?? []).map((c: any) => `${c.name} [${c.id}]`).join("\n");
    const pmList = (pms ?? []).map((p: any) => `${p.name} [${p.id}]`).join("\n");

    const enriched = await categoriseInBatches(debitRows, categoryList, pmList);

    await admin.from("statement_imports").update({ status: "categorized" }).eq("id", importId);

    const rows = debitRows.map((r, i) => {
      const sug = enriched[i] || {};
      return {
        import_id: importId!,
        bank_account_id: bankAccountId,
        txn_date: r.txn_date,
        narration: r.narration.slice(0, 1000),
        ref_no: r.ref_no || null,
        amount: r.amount,
        suggested_category_id: sug.category_id && catSet.has(sug.category_id) ? sug.category_id : null,
        suggested_payment_method_id: sug.payment_method_id && pmSet.has(sug.payment_method_id) ? sug.payment_method_id : null,
        suggested_vendor: sug.vendor_name || null,
        confidence: r.balance_check_passed
          ? Math.max(0, Math.min(1, Number(sug.confidence) || 0.5))
          : 0.3, // sanity-check failed → low confidence forces user review
        status: "pending",
      };
    });

    // Dedup against existing
    let inserted = 0;
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

    const totalDebits = rows.reduce((s, r) => s + r.amount, 0);
    const sortedDates = rows.map((r) => r.txn_date).sort();

    await admin.from("statement_imports").update({
      status: "review",
      txn_count: inserted,
      total_debits: totalDebits,
      period_from: sortedDates[0] || null,
      period_to: sortedDates[sortedDates.length - 1] || null,
    }).eq("id", importId);

    return json({ import_id: importId, txn_count: inserted, total_debits: totalDebits });
  } catch (err: any) {
    console.error("parse-statement error:", err);
    if (importId) {
      const message = String(err?.message || err).slice(0, 500);
      const failureStatus = message.toLowerCase().includes("ai") || message.includes("Lovable AI") || message.toLowerCase().includes("gateway")
        ? "failed_categorized"
        : message.toLowerCase().includes("pdf") || message.toLowerCase().includes("extract") || message.toLowerCase().includes("scan")
          ? "failed_extracted"
          : "failed";
      await createClient(SUPABASE_URL, SERVICE_KEY)
        .from("statement_imports")
        .update({ status: failureStatus, error_message: message })
        .eq("id", importId);
    }
    return json({ error: String(err?.message || err) }, 500);
  }
});

// ─────────────────────────────────────────────────────────────
// PDF positional extraction (pdfjs-dist)
// ─────────────────────────────────────────────────────────────
async function extractPositionalText(buf: Uint8Array): Promise<PdfTextItem[]> {
  // pdfjs-dist worker isn't usable in Deno edge — disable it.
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc = "";
  const loadingTask = (pdfjsLib as any).getDocument({
    data: buf,
    disableWorker: true,
    isEvalSupported: false,
    useSystemFonts: true,
  });
  const pdf = await loadingTask.promise;
  const items: PdfTextItem[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    for (const it of tc.items as any[]) {
      const str = (it.str ?? "").trim();
      if (!str) continue;
      // transform = [a, b, c, d, e, f] ; e = x, f = y
      const x = it.transform?.[4] ?? 0;
      const y = it.transform?.[5] ?? 0;
      items.push({ str, x, y, page: p });
    }
  }
  return items;
}

// ─────────────────────────────────────────────────────────────
// Detect column header positions, then bucket rows
// ─────────────────────────────────────────────────────────────
function extractDebitRows(items: PdfTextItem[]): DebitRow[] {
  // Group by page so column detection re-runs per page (some banks repeat headers).
  const byPage = new Map<number, PdfTextItem[]>();
  for (const it of items) {
    if (!byPage.has(it.page)) byPage.set(it.page, []);
    byPage.get(it.page)!.push(it);
  }

  const allRows: DebitRow[] = [];
  let lastBalance: number | null = null;

  for (const [, pageItems] of byPage) {
    const layout = detectColumnLayout(pageItems);
    if (!layout) continue;

    // Group items into rows by y-coordinate (within tolerance)
    // Only items below the header row (smaller y in pdf coords; pdfjs y is bottom-up)
    const headerY = pageItems
      .filter((it) => /^(date|narration|description|particulars)$/i.test(it.str))
      .map((it) => it.y)
      .sort((a, b) => b - a)[0]; // topmost header occurrence

    const bodyItems = pageItems
      .filter((it) => it.y < (headerY ?? Infinity) - 2)
      .sort((a, b) => b.y - a.y || a.x - b.x);

    const rows = groupByY(bodyItems, 3);

    for (const row of rows) {
      const cells = bucketByColumn(row, layout);
      const dateStr = parseDateCell(cells.date);
      if (!dateStr) continue;

      const wd = parseAmount(cells.withdrawal);
      const dep = parseAmount(cells.deposit);
      const bal = parseAmount(cells.balance);

      // Skip non-debit rows
      if (wd == null || wd <= 0) {
        if (bal != null) lastBalance = bal;
        continue;
      }
      if (dep != null && dep > 0) {
        // both columns? trust deposit and skip
        if (bal != null) lastBalance = bal;
        continue;
      }

      // Sanity check: prevBal - wd ≈ bal
      let balanceOk = true;
      if (bal != null && lastBalance != null) {
        balanceOk = Math.abs(lastBalance - wd - bal) < 1.0;
      }

      allRows.push({
        txn_date: dateStr,
        narration: cells.narration.trim().replace(/\s+/g, " "),
        ref_no: cells.ref?.trim() || null,
        amount: wd,
        balance: bal,
        balance_check_passed: balanceOk,
      });

      if (bal != null) lastBalance = bal;
    }
  }

  return allRows;
}

function detectColumnLayout(items: PdfTextItem[]): ColumnLayout | null {
  // Find header tokens (case-insensitive) and grab their x-positions
  const find = (re: RegExp) => items.find((it) => re.test(it.str));
  const date = find(/^date$/i);
  const narration = find(/^(narration|description|particulars)$/i);
  const ref = find(/^(chq|ref|cheque|chq\.?\/ref|reference)/i);
  const withdrawal = find(/^(withdrawal|withdraw|debit|dr|wd)/i);
  const deposit = find(/^(deposit|credit|cr)/i);
  const balance = find(/^(closing\s*balance|balance|bal)/i);

  if (!date || !narration || !withdrawal || !deposit || !balance) return null;

  // Sort columns by x to derive end-boundaries
  const cols = [
    { key: "date", x: date.x },
    { key: "narration", x: narration.x },
    ...(ref ? [{ key: "ref", x: ref.x }] : []),
    { key: "withdrawal", x: withdrawal.x },
    { key: "deposit", x: deposit.x },
    { key: "balance", x: balance.x },
  ].sort((a, b) => a.x - b.x);

  const ends: Record<string, number> = {};
  for (let i = 0; i < cols.length; i++) {
    ends[cols[i].key] = cols[i + 1] ? cols[i + 1].x - 0.5 : Infinity;
  }

  return {
    date: date.x,
    narration: narration.x,
    ref: ref?.x ?? null,
    withdrawal: withdrawal.x,
    deposit: deposit.x,
    balance: balance.x,
    dateEnd: ends.date,
    narrationEnd: ends.narration,
    refEnd: ends.ref ?? -Infinity,
    withdrawalEnd: ends.withdrawal,
    depositEnd: ends.deposit,
  };
}

function groupByY(items: PdfTextItem[], tolerance: number): PdfTextItem[][] {
  const rows: PdfTextItem[][] = [];
  for (const it of items) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(last[0].y - it.y) <= tolerance) {
      last.push(it);
    } else {
      rows.push([it]);
    }
  }
  return rows;
}

function bucketByColumn(row: PdfTextItem[], layout: ColumnLayout): {
  date: string; narration: string; ref: string; withdrawal: string; deposit: string; balance: string;
} {
  const buckets = { date: [] as string[], narration: [] as string[], ref: [] as string[], withdrawal: [] as string[], deposit: [] as string[], balance: [] as string[] };
  const sorted = [...row].sort((a, b) => a.x - b.x);
  for (const it of sorted) {
    const x = it.x;
    if (x < layout.dateEnd) buckets.date.push(it.str);
    else if (x < layout.narrationEnd) buckets.narration.push(it.str);
    else if (layout.ref != null && x < layout.refEnd) buckets.ref.push(it.str);
    else if (x < layout.withdrawalEnd) buckets.withdrawal.push(it.str);
    else if (x < layout.depositEnd) buckets.deposit.push(it.str);
    else buckets.balance.push(it.str);
  }
  return {
    date: buckets.date.join(" "),
    narration: buckets.narration.join(" "),
    ref: buckets.ref.join(" "),
    withdrawal: buckets.withdrawal.join(" "),
    deposit: buckets.deposit.join(" "),
    balance: buckets.balance.join(" "),
  };
}

function parseAmount(s: string): number | null {
  if (!s) return null;
  const cleaned = s.replace(/[,₹\s]/g, "").replace(/cr|dr/gi, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseDateCell(s: string): string | null {
  if (!s) return null;
  const trimmed = s.trim();
  // dd/mm/yy(yy)
  let m = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = (Number(y) > 50 ? "19" : "20") + y;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // dd MMM yyyy
  m = trimmed.match(/^(\d{1,2})\s*([A-Za-z]{3})\s*(\d{2,4})/);
  if (m) {
    const months: Record<string, string> = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
    const mo = months[m[2].toLowerCase()];
    if (!mo) return null;
    let y = m[3];
    if (y.length === 2) y = (Number(y) > 50 ? "19" : "20") + y;
    return `${y}-${mo}-${m[1].padStart(2, "0")}`;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// Stage 2: AI categorisation in batches
// ─────────────────────────────────────────────────────────────
async function categoriseInBatches(rows: DebitRow[], categoryList: string, pmList: string) {
  const out: Array<{ category_id?: string; payment_method_id?: string; vendor_name?: string; confidence?: number }> = [];
  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const indexed = batch.map((r, idx) => ({ idx, narration: r.narration, amount: r.amount }));
    const result = await callAiBatch(indexed, categoryList, pmList);
    for (let j = 0; j < batch.length; j++) {
      out.push(result[j] || {});
    }
  }
  return out;
}

async function callAiBatch(
  rows: Array<{ idx: number; narration: string; amount: number }>,
  categoryList: string,
  pmList: string,
) {
  const tools = [
    {
      type: "function",
      function: {
        name: "categorise_transactions",
        description: "Assign category, payment method and clean vendor name to each transaction.",
        parameters: {
          type: "object",
          properties: {
            results: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  idx: { type: "number" },
                  category_id: { type: "string" },
                  payment_method_id: { type: "string" },
                  vendor_name: { type: "string" },
                  confidence: { type: "number" },
                },
                required: ["idx", "confidence"],
                additionalProperties: false,
              },
            },
          },
          required: ["results"],
          additionalProperties: false,
        },
      },
    },
  ];

  const systemPrompt = `You categorise pre-classified DEBIT transactions from Indian bank statements.

Available expense categories (return exact UUID):
${categoryList}

Available payment methods (return exact UUID):
${pmList}

Rules:
- These are ALL debits; do not question that.
- Pick the best category UUID and payment method UUID from the lists above. Empty string if no good match.
- Payment method hints from narration prefix:
  * UPI- / UPI/  → UPI
  * NEFT / NEFT-  → NEFT
  * IMPS / IMPS-  → IMPS
  * RTGS  → RTGS
  * POS / VPS  → Card
  * ATW / NWD / ATM  → ATM
  * CHQ / CHEQUE  → Cheque
- Vendor: extract real merchant from UPI handles like "UPI-SWIGGY-..." → "Swiggy". Strip "@oksbi", numeric IDs.
- Confidence: 0.95+ obvious, 0.7-0.9 reasonable, <0.7 guess.
- Return ONLY UUIDs from the lists. Never invent.`;

  const userPrompt = `Categorise each row. Return one result per idx.\n\n${rows.map((r) => `${r.idx}. ₹${r.amount} — ${r.narration}`).join("\n")}`;

  const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools,
      tool_choice: { type: "function", function: { name: "categorise_transactions" } },
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
  if (!toolCall) throw new Error("AI did not return categorisation output");
  const parsed = JSON.parse(toolCall.function.arguments);
  const results: any[] = parsed.results ?? [];
  // map idx → result
  const map = new Map<number, any>();
  for (const r of results) map.set(r.idx, r);
  return rows.map((r) => map.get(r.idx) || {});
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
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
