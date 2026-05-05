// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

interface Decision {
  txn_id: string;
  action: "approve" | "skip";
  category_id?: string;
  payment_method_id?: string | null;
  vendor_name?: string;
  payment_period?: string | null; // YYYY-MM-01
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: roleRow } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleRow) return json({ error: "Admin only" }, 403);

  try {
    const { import_id, decisions } = (await req.json()) as {
      import_id: string;
      decisions: Decision[];
    };
    if (!import_id || !Array.isArray(decisions)) {
      return json({ error: "import_id and decisions[] required" }, 400);
    }

    // Fetch import + bank account
    const { data: imp, error: impErr } = await admin
      .from("statement_imports")
      .select("id, bank_account_id, status, bank_accounts!inner(id, source_id, name)")
      .eq("id", import_id)
      .single();
    if (impErr || !imp) return json({ error: "Import not found" }, 404);
    if (imp.status === "approved") return json({ error: "Already approved" }, 400);

    const bankAccount = (imp as any).bank_accounts;
    if (!bankAccount.source_id) {
      return json({ error: "Bank account has no linked expense source" }, 400);
    }

    // Get user profile for paid_by
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", userData.user.id)
      .single();
    const paidByName = profile?.full_name || "Admin";

    // Fetch staged txns by id
    const txnIds = decisions.map((d) => d.txn_id);
    const { data: stagedTxns, error: stErr } = await admin
      .from("statement_transactions")
      .select("*")
      .in("id", txnIds)
      .eq("import_id", import_id);
    if (stErr) throw stErr;

    const txnMap = new Map((stagedTxns ?? []).map((t: any) => [t.id, t]));

    let approvedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const d of decisions) {
      const txn = txnMap.get(d.txn_id);
      if (!txn) continue;
      if (txn.status === "approved") continue;

      if (d.action === "skip") {
        await admin
          .from("statement_transactions")
          .update({ status: "skipped" })
          .eq("id", d.txn_id);
        skippedCount++;
        continue;
      }

      const categoryId = d.category_id || txn.suggested_category_id;
      if (!categoryId) {
        errors.push(`${txn.narration.slice(0, 40)}: category required`);
        continue;
      }

      // Insert expense
      const periodFirst = `${txn.txn_date.slice(0, 7)}-01`;
      const { data: exp, error: expErr } = await admin
        .from("expenses")
        .insert({
          payment_date: txn.txn_date,
          payment_period: periodFirst,
          category_id: categoryId,
          source_id: bankAccount.source_id,
          payment_method_id: d.payment_method_id ?? txn.suggested_payment_method_id ?? null,
          amount: txn.amount,
          description: txn.narration,
          paid_by: paidByName,
          vendor_name: d.vendor_name ?? txn.suggested_vendor ?? null,
          status: "paid",
          created_by: userData.user.id,
        })
        .select("id")
        .single();
      if (expErr) {
        errors.push(`${txn.narration.slice(0, 40)}: ${expErr.message}`);
        continue;
      }

      await admin
        .from("statement_transactions")
        .update({ status: "approved", expense_id: exp.id })
        .eq("id", d.txn_id);
      approvedCount++;
    }

    // If no pending rows remain on this import, mark approved
    const { count: pendingLeft } = await admin
      .from("statement_transactions")
      .select("id", { count: "exact", head: true })
      .eq("import_id", import_id)
      .eq("status", "pending");

    if ((pendingLeft ?? 0) === 0) {
      await admin
        .from("statement_imports")
        .update({ status: "approved" })
        .eq("id", import_id);
    }

    return json({ approved: approvedCount, skipped: skippedCount, errors });
  } catch (err: any) {
    console.error("approve-statement-import error:", err);
    return json({ error: String(err?.message || err) }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
