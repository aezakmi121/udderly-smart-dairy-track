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
    // Rate lists can take effect from a session, not just a date (e.g. new
    // rates from 1 Aug evening). Defaults to morning = start of that day.
    const rawSession = (formData.get('effective_session') as string) || 'morning';
    const effectiveSession = rawSession.toLowerCase() === 'evening' ? 'evening' : 'morning';

    if (!file) {
      throw new Error('No file provided');
    }

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      throw new Error('File must be an Excel (.xlsx) file');
    }

    console.log('Processing Excel file:', file.name, 'Effective from:', effectiveFrom, effectiveSession);

    // Read Excel file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    const requiredTabs = ['Buffalo', 'Cow'];
    const results: Array<{ species: string; snf_count: number; fat_count: number; rows_upserted: number; }> = [];
    // Structural checks reported back to the uploader. These make no assumption
    // about how the dairy prices milk — the sheet is the authority, and a rate
    // is whatever its cell says. They only look for shapes that would break the
    // app's own reading of the list, or that suggest a data-entry slip.
    const checks: Array<Record<string, unknown>> = [];
    // Species is derived from whichever matrix prices a sample, so a cell
    // priced by two species would make that ambiguous.
    const pricedCells = new Map<string, string[]>();
    // Sheets often mix rounded and unrounded values for the same rate (35.66
    // beside 35.661538...), which reads as a microscopic drop. Ignore anything
    // under a paisa: a real mistyped digit is orders of magnitude larger.
    const RATE_EPSILON = 0.01;

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
      const rateRows: Array<{ species: string; fat: number; snf: number; rate: number; effective_from: string; effective_session: string }> = [];
      
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
              effective_from: effectiveFrom,
              effective_session: effectiveSession
            });
          }
        }
      }

      if (rateRows.length === 0) {
        throw new Error(`No valid rate data found in ${species} tab`);
      }

      const priced = rateRows.filter((r) => r.rate > 0);

      // Monotonicity: a priced rate should never fall as fat or SNF rises.
      // This assumes no pricing model — a flat floor, stepped bands and a
      // straight-line sheet all satisfy it — but a mistyped digit (35 -> 350,
      // or a decimal slip) shows up as a reversal. With thousands of cells that
      // would otherwise never be caught by eye before reaching farmer payments.
      const rateAt = new Map<string, number>();
      for (const r of priced) rateAt.set(`${r.fat}|${r.snf}`, r.rate);

      const reversals: Array<{ axis: string; fat: number; snf: number; rate: number; prevRate: number }> = [];
      const sortedFats = [...new Set(rateRows.map((r) => r.fat))].sort((a, b) => a - b);
      const sortedSnfs = [...new Set(rateRows.map((r) => r.snf))].sort((a, b) => a - b);

      for (const snf of sortedSnfs) {
        let prev: { fat: number; rate: number } | null = null;
        for (const fat of sortedFats) {
          const rate = rateAt.get(`${fat}|${snf}`);
          if (rate === undefined) continue;
          if (prev && prev.rate - rate > RATE_EPSILON) {
            reversals.push({ axis: 'fat', fat, snf, rate, prevRate: prev.rate });
          }
          prev = { fat, rate };
        }
      }
      for (const fat of sortedFats) {
        let prev: { snf: number; rate: number } | null = null;
        for (const snf of sortedSnfs) {
          const rate = rateAt.get(`${fat}|${snf}`);
          if (rate === undefined) continue;
          if (prev && prev.rate - rate > RATE_EPSILON) {
            reversals.push({ axis: 'snf', fat, snf, rate, prevRate: prev.rate });
          }
          prev = { snf, rate };
        }
      }

      for (const r of priced) {
        const key = `${r.fat}|${r.snf}`;
        pricedCells.set(key, [...(pricedCells.get(key) ?? []), species]);
      }

      const pricedFats = priced.map((r) => r.fat);
      const pricedSnfs = priced.map((r) => r.snf);

      const pricedRates = priced.map((r) => r.rate);

      checks.push({
        species,
        priced_cells: priced.length,
        unpriced_cells: rateRows.length - priced.length,
        payable_fat_min: pricedFats.length ? Math.min(...pricedFats) : null,
        payable_fat_max: pricedFats.length ? Math.max(...pricedFats) : null,
        payable_snf_min: pricedSnfs.length ? Math.min(...pricedSnfs) : null,
        payable_snf_max: pricedSnfs.length ? Math.max(...pricedSnfs) : null,
        rate_min: pricedRates.length ? Math.min(...pricedRates) : null,
        rate_max: pricedRates.length ? Math.max(...pricedRates) : null,
        reversals: reversals.slice(0, 20),
        reversal_count: reversals.length,
      });

      // Upsert to database
      const { error } = await supabase
        .from('rate_matrix')
        .upsert(rateRows, { 
          onConflict: 'species,fat,snf,effective_from,effective_session',
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