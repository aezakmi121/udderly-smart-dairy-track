import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const effectiveFrom = formData.get('effective_from') as string;

    if (!file) {
      throw new Error('No file provided');
    }

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      throw new Error('File must be an Excel (.xlsx) file');
    }

    console.log('Processing Excel file:', file.name, 'Effective date:', effectiveFrom);

    // Read Excel file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    const requiredTabs = ['Buffalo', 'Cow'];
    const results: Array<{ species: string; snf_count: number; fat_count: number; rows_upserted: number; }> = [];
    // Sanity checks reported back to the uploader — advisory, never blocking,
    // so a legitimately irregular rate list can still be loaded.
    const checks: Array<Record<string, unknown>> = [];
    // Rate lists are quoted as a single rate at a reference fat percentage.
    const REFERENCE_FAT = 6.5;
    const RATE_TOLERANCE = 0.05;
    // Species is derived from whichever matrix prices a sample, so a cell
    // priced by two species would make that ambiguous.
    const pricedCells = new Map<string, string[]>();

    for (const species of requiredTabs) {
      if (!workbook.SheetNames.includes(species)) {
        throw new Error(`Missing required tab: ${species}`);
      }

      const worksheet = workbook.Sheets[species];
      console.log(`Processing ${species} tab`);

      // Find SNF axis (row 2, starting from column B)
      const snfValues: number[] = [];
      let col = 1; // Column B = 1 (0-indexed: A=0, B=1)
      while (true) {
        const cellAddress = XLSX.utils.encode_cell({ c: col, r: 1 }); // Row 2 = index 1
        const cell = worksheet[cellAddress];
        if (!cell || typeof cell.v !== 'number') break;
        snfValues.push(cell.v);
        col++;
      }

      if (snfValues.length === 0) {
        throw new Error(`No numeric SNF headers found in ${species} tab`);
      }

      // Find Fat axis (column A, starting from row 3)
      const fatValues: number[] = [];
      let row = 2; // Row 3 = index 2
      while (true) {
        const cellAddress = XLSX.utils.encode_cell({ c: 0, r: row }); // Column A = 0
        const cell = worksheet[cellAddress];
        if (!cell || typeof cell.v !== 'number') break;
        fatValues.push(cell.v);
        row++;
      }

      if (fatValues.length === 0) {
        throw new Error(`No numeric Fat headers found in ${species} tab`);
      }

      console.log(`${species}: Found ${fatValues.length} fat values, ${snfValues.length} SNF values`);

      // Process rate grid (B3 onwards)
      const rateRows: Array<{ species: string; fat: number; snf: number; rate: number; effective_from: string }> = [];
      
      for (let fatIdx = 0; fatIdx < fatValues.length; fatIdx++) {
        for (let snfIdx = 0; snfIdx < snfValues.length; snfIdx++) {
          const cellAddress = XLSX.utils.encode_cell({ 
            c: snfIdx + 1, // SNF starts from column B (1)
            r: fatIdx + 2  // Fat starts from row 3 (2)
          });
          
          const cell = worksheet[cellAddress];
          if (cell && typeof cell.v === 'number') {
            rateRows.push({
              species,
              fat: fatValues[fatIdx],
              snf: snfValues[snfIdx],
              rate: cell.v,
              effective_from: effectiveFrom
            });
          }
        }
      }

      if (rateRows.length === 0) {
        throw new Error(`No valid rate data found in ${species} tab`);
      }

      // Consistency check. These lists are generated from a single base rate
      // quoted at a reference fat (rate = fat * base / referenceFat), so every
      // priced cell should imply the same base. A cell that disagrees is almost
      // certainly a typo in the sheet, and with thousands of cells it would
      // never be caught by eye before it reached farmer payments.
      const priced = rateRows.filter((r) => r.rate > 0);
      const implied = priced.map((r) => (r.rate * REFERENCE_FAT) / r.fat);
      let baseRate: number | null = null;
      const outliers: typeof rateRows = [];

      if (implied.length > 0) {
        // Median is robust to a handful of bad cells.
        const sorted = [...implied].sort((a, b) => a - b);
        baseRate = sorted[Math.floor(sorted.length / 2)];
        for (let i = 0; i < priced.length; i++) {
          const expected = (priced[i].fat * baseRate) / REFERENCE_FAT;
          if (Math.abs(priced[i].rate - expected) > RATE_TOLERANCE) {
            outliers.push(priced[i]);
          }
        }
      }

      for (const r of priced) {
        const key = `${r.fat}|${r.snf}`;
        pricedCells.set(key, [...(pricedCells.get(key) ?? []), species]);
      }

      const pricedFats = priced.map((r) => r.fat);
      const pricedSnfs = priced.map((r) => r.snf);

      checks.push({
        species,
        priced_cells: priced.length,
        unpriced_cells: rateRows.length - priced.length,
        implied_base_rate: baseRate === null ? null : Number(baseRate.toFixed(2)),
        reference_fat: REFERENCE_FAT,
        payable_fat_min: pricedFats.length ? Math.min(...pricedFats) : null,
        payable_fat_max: pricedFats.length ? Math.max(...pricedFats) : null,
        payable_snf_min: pricedSnfs.length ? Math.min(...pricedSnfs) : null,
        payable_snf_max: pricedSnfs.length ? Math.max(...pricedSnfs) : null,
        outliers: outliers.slice(0, 20).map((o) => ({
          fat: o.fat,
          snf: o.snf,
          rate: o.rate,
          expected: Number(((o.fat * (baseRate ?? 0)) / REFERENCE_FAT).toFixed(2)),
        })),
        outlier_count: outliers.length,
      });

      // Upsert to database
      const { error } = await supabase
        .from('rate_matrix')
        .upsert(rateRows, { 
          onConflict: 'species,fat,snf,effective_from',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('Database error:', error);
        throw new Error(`Failed to save ${species} rates: ${error.message}`);
      }

      results.push({
        species,
        snf_count: snfValues.length,
        fat_count: fatValues.length,
        rows_upserted: rateRows.length
      });

      console.log(`${species}: Upserted ${rateRows.length} rate entries`);
    }

    // A cell priced by more than one species makes matrix-derived species
    // detection ambiguous for that fat/SNF pair.
    const overlaps = [...pricedCells.entries()]
      .filter(([, sp]) => sp.length > 1)
      .map(([key, sp]) => {
        const [fat, snf] = key.split('|');
        return { fat: Number(fat), snf: Number(snf), species: sp };
      });

    return new Response(
      JSON.stringify({
        success: true,
        results,
        checks,
        overlaps: overlaps.slice(0, 20),
        overlap_count: overlaps.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in upload-rate-matrix function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});