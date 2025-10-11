import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Download } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { generateIndividualCowPerformancePDF } from '@/utils/pdfGenerator';
import { useToast } from '@/hooks/use-toast';

export const IndividualCowPerformance = () => {
  const [selectedCowId, setSelectedCowId] = useState<string>('');
  const { toast } = useToast();

  // Fetch all cows for dropdown
  const { data: cows } = useQuery({
    queryKey: ['cows-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cows')
        .select('id, cow_number, breed, status')
        .order('cow_number');
      
      if (error) throw error;
      
      // Sort numerically instead of alphabetically
      return data?.sort((a, b) => {
        const numA = parseInt(a.cow_number.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.cow_number.replace(/\D/g, '')) || 0;
        return numA - numB;
      });
    }
  });

  // Fetch selected cow details
  const { data: cowDetails, isLoading } = useQuery({
    queryKey: ['cow-performance', selectedCowId],
    enabled: !!selectedCowId,
    queryFn: async () => {
      const { data: cow, error: cowError } = await supabase
        .from('cows')
        .select('*')
        .eq('id', selectedCowId)
        .single();

      if (cowError) throw cowError;

      // Calculate days in milk
      const daysInMilk = cow.last_calving_date 
        ? Math.floor((new Date().getTime() - new Date(cow.last_calving_date).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return { ...cow, daysInMilk };
    }
  });

  // Fetch milk production history (last 6 months)
  const { data: productionHistory } = useQuery({
    queryKey: ['cow-production-history', selectedCowId],
    enabled: !!selectedCowId,
    queryFn: async () => {
      const sixMonthsAgo = subMonths(new Date(), 6);
      
      const { data, error } = await supabase
        .from('milk_production')
        .select('production_date, quantity, session')
        .eq('cow_id', selectedCowId)
        .gte('production_date', format(sixMonthsAgo, 'yyyy-MM-dd'))
        .order('production_date');

      if (error) throw error;

      // Group by month
      const monthlyData: { [key: string]: { month: string; total: number; count: number } } = {};
      
      data?.forEach(record => {
        const monthKey = format(new Date(record.production_date), 'MMM yyyy');
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { month: monthKey, total: 0, count: 0 };
        }
        monthlyData[monthKey].total += Number(record.quantity);
        monthlyData[monthKey].count += 1;
      });

      return Object.values(monthlyData).map(m => ({
        month: m.month,
        avgYield: Number((m.total / m.count).toFixed(2)),
        totalYield: Number(m.total.toFixed(2))
      }));
    }
  });

  // Fetch recent milk production (last 30 days)
  const { data: recentProduction } = useQuery({
    queryKey: ['cow-recent-production', selectedCowId],
    enabled: !!selectedCowId,
    queryFn: async () => {
      const thirtyDaysAgo = subMonths(new Date(), 1);
      
      const { data, error } = await supabase
        .from('milk_production')
        .select('quantity, production_date')
        .eq('cow_id', selectedCowId)
        .gte('production_date', format(thirtyDaysAgo, 'yyyy-MM-dd'));

      if (error) throw error;

      const total = data?.reduce((sum, record) => sum + Number(record.quantity), 0) || 0;
      const avgDaily = data && data.length > 0 ? total / data.length : 0;

      return {
        last7Days: data?.slice(-14).reduce((sum, record) => sum + Number(record.quantity), 0) / 7 || 0,
        last30Days: avgDaily
      };
    }
  });

  // Fetch AI/breeding history
  const { data: breedingHistory } = useQuery({
    queryKey: ['cow-breeding-history', selectedCowId],
    enabled: !!selectedCowId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_records')
        .select('*')
        .eq('cow_id', selectedCowId)
        .order('ai_date', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    }
  });

  // Fetch vaccination history
  const { data: vaccinationHistory } = useQuery({
    queryKey: ['cow-vaccination-history', selectedCowId],
    enabled: !!selectedCowId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vaccination_records')
        .select(`
          *,
          vaccination_schedules!vaccination_schedule_id (vaccine_name)
        `)
        .eq('cow_id', selectedCowId)
        .order('vaccination_date', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    }
  });

  // Fetch weight logs
  const { data: weightLogs } = useQuery({
    queryKey: ['cow-weight-logs', selectedCowId],
    enabled: !!selectedCowId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weight_logs')
        .select('*')
        .eq('cow_id', selectedCowId)
        .order('log_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    }
  });

  const handleGeneratePDF = async () => {
    if (!selectedCowId || !cowDetails) {
      toast({
        title: "No cow selected",
        description: "Please select a cow to generate the report",
        variant: "destructive"
      });
      return;
    }

    try {
      await generateIndividualCowPerformancePDF({
        cow: cowDetails,
        productionHistory: productionHistory || [],
        recentProduction: recentProduction || { last7Days: 0, last30Days: 0 },
        breedingHistory: breedingHistory || [],
        vaccinationHistory: vaccinationHistory || [],
        weightLogs: weightLogs || []
      });

      toast({
        title: "Report generated successfully",
        description: `Performance report for cow ${cowDetails.cow_number} has been downloaded`
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error generating report",
        description: "Failed to generate PDF report",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="w-full sm:w-64">
          <Select value={selectedCowId} onValueChange={setSelectedCowId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a cow" />
            </SelectTrigger>
            <SelectContent>
              {cows?.map((cow) => (
                <SelectItem key={cow.id} value={cow.id}>
                  {cow.cow_number} - {cow.breed || 'Unknown'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {selectedCowId && (
          <Button onClick={handleGeneratePDF} className="gap-2">
            <FileText className="h-4 w-4" />
            Generate PDF Report
          </Button>
        )}
      </div>

      {!selectedCowId && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Please select a cow to view performance details
          </CardContent>
        </Card>
      )}

      {selectedCowId && cowDetails && (
        <>
          {/* Key Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Lifetime Yield</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {Number(cowDetails.lifetime_yield || 0).toFixed(2)} L
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total production</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Current Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {Number(cowDetails.current_month_yield || 0).toFixed(2)} L
                </div>
                <p className="text-xs text-muted-foreground mt-1">This month's total</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Peak Yield</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {Number(cowDetails.peak_yield || 0).toFixed(2)} L
                </div>
                <p className="text-xs text-muted-foreground mt-1">Highest recorded</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Days in Milk</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {cowDetails.daysInMilk}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Lactation #{cowDetails.lactation_number || 1}</p>
              </CardContent>
            </Card>
          </div>

          {/* Average Daily Yield */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Avg Daily (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {recentProduction?.last7Days?.toFixed(2) || '0.00'} L/day
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Avg Daily (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {recentProduction?.last30Days?.toFixed(2) || '0.00'} L/day
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Production Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>6-Month Production Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productionHistory || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="totalYield" fill="hsl(var(--primary))" name="Total Yield (L)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Health & Breeding Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Vaccination History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Recent Vaccinations</CardTitle>
              </CardHeader>
              <CardContent>
                {vaccinationHistory && vaccinationHistory.length > 0 ? (
                  <div className="space-y-2">
                    {vaccinationHistory.slice(0, 3).map((vax, idx) => (
                      <div key={idx} className="flex justify-between text-sm border-b pb-2">
                        <span className="font-medium">{vax.vaccination_schedules?.vaccine_name}</span>
                        <span className="text-muted-foreground">
                          {format(new Date(vax.vaccination_date), 'dd MMM yyyy')}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No vaccination records</p>
                )}
              </CardContent>
            </Card>

            {/* AI History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Recent AI Services</CardTitle>
              </CardHeader>
              <CardContent>
                {breedingHistory && breedingHistory.length > 0 ? (
                  <div className="space-y-2">
                    {breedingHistory.slice(0, 3).map((ai, idx) => (
                      <div key={idx} className="flex justify-between text-sm border-b pb-2">
                        <span className="font-medium">Service #{ai.service_number}</span>
                        <span className="text-muted-foreground">
                          {format(new Date(ai.ai_date), 'dd MMM yyyy')}
                          {ai.pd_result && ` - ${ai.pd_result}`}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No AI records</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Weight Logs */}
          {weightLogs && weightLogs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Weight History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {weightLogs.slice(0, 5).map((log, idx) => (
                    <div key={idx} className="flex justify-between text-sm border-b pb-2">
                      <span>{format(new Date(log.log_date), 'dd MMM yyyy')}</span>
                      <span className="font-medium">{Number(log.calculated_weight).toFixed(2)} kg</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
