import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // API key authentication
  const authHeader = req.headers.get('Authorization');
  const PUBLIC_API_KEY = Deno.env.get('PUBLIC_API_KEY');

  if (!PUBLIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'API not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!authHeader || authHeader !== `Bearer ${PUBLIC_API_KEY}`) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  try {
    switch (type) {
      case 'expenses': {
        let query = supabase
          .from('expenses')
          .select('*, expense_categories:category_id(name), expense_sources:source_id(name), payment_methods:payment_method_id(name)')
          .order('payment_date', { ascending: false });

        if (from) query = query.gte('payment_date', from);
        if (to) query = query.lte('payment_date', to);

        const { data, error } = await query;
        if (error) throw error;

        const total = data?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
        return respond({ data, total, count: data?.length || 0 });
      }

      case 'milk-production': {
        let query = supabase
          .from('milk_production')
          .select('*, cows:cow_id(cow_number, breed)')
          .order('production_date', { ascending: false });

        if (from) query = query.gte('production_date', from);
        if (to) query = query.lte('production_date', to);

        const { data, error } = await query;
        if (error) throw error;

        const totalLiters = data?.reduce((sum, p) => sum + (p.quantity || 0), 0) || 0;
        return respond({ data, totalLiters, count: data?.length || 0 });
      }

      case 'revenue': {
        const [plantSales, storeSales, ccSales] = await Promise.all([
          fetchWithDateRange(supabase, 'plant_sales', 'sale_date', from, to),
          fetchWithDateRange(supabase, 'store_sales', 'sale_date', from, to),
          fetchWithDateRange(supabase, 'collection_center_sales', 'sale_date', from, to),
        ]);

        const plantTotal = plantSales?.reduce((sum: number, s: any) => sum + (s.amount_received || 0), 0) || 0;
        const storeTotal = storeSales?.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0) || 0;
        const ccTotal = ccSales?.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0) || 0;

        return respond({
          plant_sales: { data: plantSales, total: plantTotal },
          store_sales: { data: storeSales, total: storeTotal },
          collection_center_sales: { data: ccSales, total: ccTotal },
          grand_total: plantTotal + storeTotal + ccTotal,
        });
      }

      case 'summary': {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthStart = `${currentMonth}-01`;
        const nextMonth = new Date(new Date(monthStart).setMonth(new Date(monthStart).getMonth() + 1));
        const monthEnd = nextMonth.toISOString().split('T')[0];

        const [expenses, milkProd, plantSales, storeSales] = await Promise.all([
          supabase.from('expenses').select('amount').gte('payment_date', monthStart).lt('payment_date', monthEnd),
          supabase.from('milk_production').select('quantity').gte('production_date', monthStart).lt('production_date', monthEnd),
          supabase.from('plant_sales').select('amount_received').gte('sale_date', monthStart).lt('sale_date', monthEnd),
          supabase.from('store_sales').select('total_amount').gte('sale_date', monthStart).lt('sale_date', monthEnd),
        ]);

        const totalExpenses = expenses.data?.reduce((s, e) => s + (e.amount || 0), 0) || 0;
        const totalMilk = milkProd.data?.reduce((s, p) => s + (p.quantity || 0), 0) || 0;
        const totalPlantRevenue = plantSales.data?.reduce((s, p) => s + (p.amount_received || 0), 0) || 0;
        const totalStoreRevenue = storeSales.data?.reduce((s, p) => s + (p.total_amount || 0), 0) || 0;
        const totalRevenue = totalPlantRevenue + totalStoreRevenue;

        return respond({
          month: currentMonth,
          expenses: totalExpenses,
          revenue: totalRevenue,
          milk_produced_liters: totalMilk,
          profit: totalRevenue - totalExpenses,
          breakdown: {
            plant_revenue: totalPlantRevenue,
            store_revenue: totalStoreRevenue,
          }
        });
      }

      default:
        return new Response(
          JSON.stringify({ 
            error: 'Invalid type parameter',
            available: ['expenses', 'milk-production', 'revenue', 'summary'],
            usage: '?type=summary or ?type=expenses&from=2024-01-01&to=2024-12-31'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('API error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function respond(data: any) {
  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function fetchWithDateRange(supabase: any, table: string, dateCol: string, from: string | null, to: string | null) {
  let query = supabase.from(table).select('*').order(dateCol, { ascending: false });
  if (from) query = query.gte(dateCol, from);
  if (to) query = query.lte(dateCol, to);
  const { data } = await query;
  return data || [];
}
