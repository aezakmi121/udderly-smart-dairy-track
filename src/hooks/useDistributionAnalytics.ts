import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';

export interface SessionBreakdown {
  source: 'farm' | 'collection_center';
  session: 'morning' | 'evening';
  species: 'cow' | 'buffalo';
  date: string;
  quantity: number;
  distributions: {
    store?: number;
    plant?: number;
    cream?: number;
    mixing?: number;
    cashSale?: number;
    calves?: number;
    workers?: number;
    home?: number;
    ffmToPlant?: number;
    ffmToDahi?: number;
  };
}

export interface SourceBreakdown {
  source: string;
  species: string;
  total: number;
  destinations: Array<{ name: string; amount: number; percentage: number }>;
}

export interface DistributionAnalytics {
  totalProduction: number;
  farmProduction: number;
  collectionCenterProduction: number;
  
  storeDispatched: number;
  storeReceived: number;
  storeDiscrepancy: number;
  
  plantDispatched: number;
  plantRevenue: number;
  
  creamExtracted: number;
  ffmGenerated: number;
  
  cashSales: number;
  mixing: number;
  
  sessionBreakdown: SessionBreakdown[];
  sourceBreakdown: SourceBreakdown[];
  
  monthlyTrends: Array<{
    month: string;
    production: number;
    storeDispatched: number;
    plantDispatched: number;
    creamExtracted: number;
  }>;
}

export const useDistributionAnalytics = (fromDate: string, toDate: string) => {
  return useQuery({
    queryKey: ['distribution-analytics', fromDate, toDate],
    queryFn: async (): Promise<DistributionAnalytics> => {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      
      // Fetch farm production (milk_production)
      const { data: farmProd, error: farmError } = await supabase
        .from('milk_production')
        .select('*')
        .gte('production_date', format(from, 'yyyy-MM-dd'))
        .lte('production_date', format(to, 'yyyy-MM-dd'))
        .limit(10000);
      
      if (farmError) throw farmError;
      
      // Fetch collection center collections (milk_collections)
      const { data: ccCollections, error: ccError } = await supabase
        .from('milk_collections')
        .select('*')
        .gte('collection_date', format(from, 'yyyy-MM-dd'))
        .lte('collection_date', format(to, 'yyyy-MM-dd'))
        .limit(10000);
      
      if (ccError) throw ccError;
      
      // Fetch farm distributions (milk_distributions)
      const { data: farmDist, error: farmDistError } = await supabase
        .from('milk_distributions')
        .select('*')
        .gte('distribution_date', format(from, 'yyyy-MM-dd'))
        .lte('distribution_date', format(to, 'yyyy-MM-dd'))
        .limit(10000);
      
      if (farmDistError) throw farmDistError;
      
      // Fetch collection center distributions
      const { data: ccDist, error: ccDistError } = await supabase
        .from('collection_center_distributions')
        .select('*')
        .gte('distribution_date', format(from, 'yyyy-MM-dd'))
        .lte('distribution_date', format(to, 'yyyy-MM-dd'))
        .limit(10000);
      
      if (ccDistError) throw ccDistError;
      
      // Fetch store receipts
      const { data: storeReceipts, error: storeError } = await supabase
        .from('store_receipts')
        .select('*')
        .gte('receipt_date', format(from, 'yyyy-MM-dd'))
        .lte('receipt_date', format(to, 'yyyy-MM-dd'))
        .limit(10000);
      
      if (storeError) throw storeError;
      
      // Fetch plant sales
      const { data: plantSales, error: plantError } = await supabase
        .from('plant_sales')
        .select('*')
        .gte('sale_date', format(from, 'yyyy-MM-dd'))
        .lte('sale_date', format(to, 'yyyy-MM-dd'))
        .limit(10000);
      
      if (plantError) throw plantError;
      
      // Calculate totals
      const farmProduction = (farmProd || []).reduce((sum, p) => sum + Number(p.quantity), 0);
      const ccProduction = (ccCollections || []).reduce((sum, c) => sum + Number(c.quantity), 0);
      const totalProduction = farmProduction + ccProduction;
      
      // Store dispatched (from distributions)
      const farmStoreDispatched = (farmDist || []).reduce((sum, d) => sum + Number(d.store || 0), 0);
      const ccStoreDispatched = (ccDist || []).reduce((sum, d) => 
        sum + Number(d.cow_to_store || 0) + Number(d.buffalo_to_store || 0), 0);
      const storeDispatched = farmStoreDispatched + ccStoreDispatched;
      
      // Store received
      const storeReceived = (storeReceipts || []).reduce((sum, r) => 
        sum + Number(r.cow_received || 0) + Number(r.buffalo_received || 0) + Number(r.mixed_received || 0), 0);
      
      const storeDiscrepancy = storeDispatched - storeReceived;
      
      // Plant dispatched and revenue
      const plantDispatched = (plantSales || []).reduce((sum, p) => sum + Number(p.quantity), 0);
      const plantRevenue = (plantSales || []).reduce((sum, p) => sum + Number(p.amount_received), 0);
      
      // Cream and FFM
      const creamExtracted = (farmDist || []).reduce((sum, d) => sum + Number(d.cream_extraction || 0), 0);
      const ffmGenerated = (farmDist || []).reduce((sum, d) => sum + Number(d.ffm_yield || 0), 0);
      
      // Cash sales and mixing
      const cashSales = (ccDist || []).reduce((sum, d) => sum + Number(d.cash_sale || 0), 0);
      const mixing = (ccDist || []).reduce((sum, d) => sum + Number(d.mixing || 0), 0);
      
      // Build session breakdown
      const sessionBreakdown: SessionBreakdown[] = [];
      
      // Farm sessions (from milk_distributions with production data)
      (farmDist || []).forEach(dist => {
        const distDate = new Date(dist.distribution_date);
        
        // Get production for evening session (today's production distributed)
        const todayProd = (farmProd || []).filter(p => 
          p.production_date === dist.distribution_date && p.session === 'evening'
        );
        
        if (todayProd.length > 0) {
          const eveningQty = todayProd.reduce((sum, p) => sum + Number(p.quantity), 0);
          sessionBreakdown.push({
            source: 'farm',
            session: 'evening',
            species: 'cow',
            date: dist.distribution_date,
            quantity: eveningQty,
            distributions: {
              store: Number(dist.store || 0),
              mixing: Number(dist.mixing || 0),
              calves: Number(dist.calves || 0),
              workers: Number(dist.farm_workers || 0),
              home: Number(dist.home || 0),
            }
          });
        }
        
        // Get production for morning session
        const morningProd = (farmProd || []).filter(p => 
          p.production_date === dist.distribution_date && p.session === 'morning'
        );
        
        if (morningProd.length > 0) {
          const morningQty = morningProd.reduce((sum, p) => sum + Number(p.quantity), 0);
          sessionBreakdown.push({
            source: 'farm',
            session: 'morning',
            species: 'cow',
            date: dist.distribution_date,
            quantity: morningQty,
            distributions: {
              store: Number(dist.store || 0),
              cream: Number(dist.cream_extraction || 0),
              calves: Number(dist.calves || 0),
              workers: Number(dist.farm_workers || 0),
              ffmToPlant: Number(dist.ffm_to_plant || 0),
              ffmToDahi: Number(dist.ffm_to_dahi || 0),
            }
          });
        }
      });
      
      // Collection center sessions
      (ccDist || []).forEach(dist => {
        // Cow distribution
        const cowTotal = Number(dist.cow_to_store || 0) + Number(dist.cow_to_plant || 0) + Number(dist.cow_to_farm_cream || 0);
        if (cowTotal > 0) {
          sessionBreakdown.push({
            source: 'collection_center',
            session: dist.session === 'morning' ? 'morning' : 'evening',
            species: 'cow',
            date: dist.distribution_date,
            quantity: cowTotal,
            distributions: {
              store: Number(dist.cow_to_store || 0),
              plant: Number(dist.cow_to_plant || 0),
              cream: Number(dist.cow_to_farm_cream || 0),
            }
          });
        }
        
        // Buffalo distribution
        const buffaloTotal = Number(dist.buffalo_to_store || 0) + Number(dist.buffalo_to_plant || 0);
        if (buffaloTotal > 0) {
          sessionBreakdown.push({
            source: 'collection_center',
            session: dist.session === 'morning' ? 'morning' : 'evening',
            species: 'buffalo',
            date: dist.distribution_date,
            quantity: buffaloTotal,
            distributions: {
              store: Number(dist.buffalo_to_store || 0),
              plant: Number(dist.buffalo_to_plant || 0),
              mixing: Number(dist.mixing || 0),
              cashSale: Number(dist.cash_sale || 0),
            }
          });
        }
      });
      
      // Build source breakdown
      const sourceBreakdown: SourceBreakdown[] = [
        {
          source: 'Farm',
          species: 'Cow',
          total: farmProduction,
          destinations: [
            { name: 'Store', amount: farmStoreDispatched, percentage: (farmStoreDispatched / farmProduction) * 100 },
            { name: 'Cream Extraction', amount: creamExtracted, percentage: (creamExtracted / farmProduction) * 100 },
          ]
        },
        {
          source: 'Collection Center',
          species: 'Mixed',
          total: ccProduction,
          destinations: [
            { name: 'Store', amount: ccStoreDispatched, percentage: (ccStoreDispatched / ccProduction) * 100 },
            { name: 'Plant', amount: plantDispatched, percentage: (plantDispatched / ccProduction) * 100 },
          ]
        }
      ];
      
      // Build monthly trends (group by month)
      const monthlyMap = new Map<string, {
        production: number;
        storeDispatched: number;
        plantDispatched: number;
        creamExtracted: number;
      }>();
      
      (farmProd || []).forEach(record => {
        const month = format(new Date(record.production_date), 'MMM yyyy');
        const existing = monthlyMap.get(month) || { production: 0, storeDispatched: 0, plantDispatched: 0, creamExtracted: 0 };
        existing.production += Number(record.quantity);
        monthlyMap.set(month, existing);
      });
      
      (ccCollections || []).forEach(record => {
        const month = format(new Date(record.collection_date), 'MMM yyyy');
        const existing = monthlyMap.get(month) || { production: 0, storeDispatched: 0, plantDispatched: 0, creamExtracted: 0 };
        existing.production += Number(record.quantity);
        monthlyMap.set(month, existing);
      });
      
      (farmDist || []).forEach(dist => {
        const month = format(new Date(dist.distribution_date), 'MMM yyyy');
        const existing = monthlyMap.get(month) || { production: 0, storeDispatched: 0, plantDispatched: 0, creamExtracted: 0 };
        existing.storeDispatched += Number(dist.store || 0);
        existing.creamExtracted += Number(dist.cream_extraction || 0);
        monthlyMap.set(month, existing);
      });
      
      (ccDist || []).forEach(dist => {
        const month = format(new Date(dist.distribution_date), 'MMM yyyy');
        const existing = monthlyMap.get(month) || { production: 0, storeDispatched: 0, plantDispatched: 0, creamExtracted: 0 };
        existing.storeDispatched += Number(dist.cow_to_store || 0) + Number(dist.buffalo_to_store || 0);
        monthlyMap.set(month, existing);
      });
      
      (plantSales || []).forEach(sale => {
        const month = format(new Date(sale.sale_date), 'MMM yyyy');
        const existing = monthlyMap.get(month) || { production: 0, storeDispatched: 0, plantDispatched: 0, creamExtracted: 0 };
        existing.plantDispatched += Number(sale.quantity);
        monthlyMap.set(month, existing);
      });
      
      const monthlyTrends = Array.from(monthlyMap.entries())
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
      
      return {
        totalProduction,
        farmProduction,
        collectionCenterProduction: ccProduction,
        storeDispatched,
        storeReceived,
        storeDiscrepancy,
        plantDispatched,
        plantRevenue,
        creamExtracted,
        ffmGenerated,
        cashSales,
        mixing,
        sessionBreakdown,
        sourceBreakdown,
        monthlyTrends,
      };
    },
    enabled: !!fromDate && !!toDate,
  });
};
