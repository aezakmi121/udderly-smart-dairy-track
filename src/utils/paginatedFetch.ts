import { supabase } from '@/integrations/supabase/client';

const PAGE_SIZE = 1000;

/**
 * Fetches all milk collections with pagination to bypass the 1000 row limit.
 */
export async function fetchAllMilkCollections(fromDate: string, toDate: string) {
  let allData: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('milk_collections')
      .select(`*, farmers!milk_collections_farmer_id_fkey (name, farmer_code)`)
      .gte('collection_date', fromDate)
      .lte('collection_date', toDate)
      .order('collection_date', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    if (data && data.length > 0) {
      allData = [...allData, ...data];
      from += PAGE_SIZE;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  return allData;
}

/**
 * Fetches all milk production with pagination to bypass the 1000 row limit.
 * Includes cow relations.
 */
export async function fetchAllMilkProduction(fromDate: string, toDate: string) {
  let allData: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('milk_production')
      .select(`*, cows!cow_id (cow_number, lactation_number, last_calving_date, breed)`)
      .gte('production_date', fromDate)
      .lte('production_date', toDate)
      .order('production_date', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    if (data && data.length > 0) {
      allData = [...allData, ...data];
      from += PAGE_SIZE;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  return allData;
}

/**
 * Fetches all milk production (basic) with pagination - no relations.
 */
export async function fetchAllMilkProductionBasic(fromDate: string, toDate: string) {
  let allData: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('milk_production')
      .select('*')
      .gte('production_date', fromDate)
      .lte('production_date', toDate)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    if (data && data.length > 0) {
      allData = [...allData, ...data];
      from += PAGE_SIZE;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  return allData;
}

/**
 * Fetches all milk collections (basic) with pagination - no relations.
 */
export async function fetchAllMilkCollectionsBasic(fromDate: string, toDate: string) {
  let allData: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('milk_collections')
      .select('*')
      .gte('collection_date', fromDate)
      .lte('collection_date', toDate)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    if (data && data.length > 0) {
      allData = [...allData, ...data];
      from += PAGE_SIZE;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  return allData;
}

/**
 * Fetches all milk distributions with pagination.
 */
export async function fetchAllMilkDistributions(fromDate: string, toDate: string) {
  let allData: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('milk_distributions')
      .select('*')
      .gte('distribution_date', fromDate)
      .lte('distribution_date', toDate)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    if (data && data.length > 0) {
      allData = [...allData, ...data];
      from += PAGE_SIZE;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  return allData;
}

/**
 * Fetches all collection center distributions with pagination.
 */
export async function fetchAllCCDistributions(fromDate: string, toDate: string) {
  let allData: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('collection_center_distributions')
      .select('*')
      .gte('distribution_date', fromDate)
      .lte('distribution_date', toDate)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    if (data && data.length > 0) {
      allData = [...allData, ...data];
      from += PAGE_SIZE;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  return allData;
}

/**
 * Fetches all expenses with pagination and relations.
 */
export async function fetchAllExpenses(fromDate: string, toDate: string, dateField: 'payment_date' | 'payment_period' = 'payment_date') {
  let allData: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        expense_categories!expenses_category_id_fkey (name),
        expense_sources!expenses_source_id_fkey (name),
        payment_methods!expenses_payment_method_id_fkey (name)
      `)
      .gte(dateField, fromDate)
      .lte(dateField, toDate)
      .order(dateField, { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    if (data && data.length > 0) {
      allData = [...allData, ...data];
      from += PAGE_SIZE;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  return allData;
}

/**
 * Fetches all feed transactions with pagination and relations.
 */
export async function fetchAllFeedTransactions(fromDate?: string, toDate?: string) {
  let allData: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('feed_transactions')
      .select(`
        *,
        feed_items!feed_item_id (name, unit)
      `)
      .order('transaction_date', { ascending: false });

    if (fromDate) query = query.gte('transaction_date', fromDate);
    if (toDate) query = query.lte('transaction_date', toDate);

    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    if (data && data.length > 0) {
      allData = [...allData, ...data];
      from += PAGE_SIZE;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  return allData;
}

/**
 * Fetches all plant sales with pagination.
 */
export async function fetchAllPlantSales(fromDate?: string, toDate?: string) {
  let allData: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('plant_sales')
      .select('*')
      .order('sale_date', { ascending: false });

    if (fromDate) query = query.gte('sale_date', fromDate);
    if (toDate) query = query.lte('sale_date', toDate);

    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    if (data && data.length > 0) {
      allData = [...allData, ...data];
      from += PAGE_SIZE;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  return allData;
}

/**
 * Fetches all store sales with pagination.
 */
export async function fetchAllStoreSales(fromDate?: string, toDate?: string) {
  let allData: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('store_sales')
      .select('*')
      .order('sale_date', { ascending: false });

    if (fromDate) query = query.gte('sale_date', fromDate);
    if (toDate) query = query.lte('sale_date', toDate);

    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    if (data && data.length > 0) {
      allData = [...allData, ...data];
      from += PAGE_SIZE;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  return allData;
}
