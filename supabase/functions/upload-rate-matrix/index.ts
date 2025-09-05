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

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in upload-rate-matrix function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});