import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Droplets, IndianRupee, TrendingUp, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface FarmerAnalyticsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmer: {
    id: string;
    name: string;
    farmer_code: string;
  } | null;
}

export const FarmerAnalyticsModal = ({ open, onOpenChange, farmer }: FarmerAnalyticsModalProps) => {
  const [fromDate, setFromDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['farmer-analytics', farmer?.id, fromDate, toDate],
    queryFn: async () => {
      if (!farmer) return null;

      const { data, error } = await supabase
        .from('milk_collections')
        .select('*')
        .eq('farmer_id', farmer.id)
        .gte('collection_date', fromDate)
        .lte('collection_date', toDate)
        .order('collection_date', { ascending: true });

      if (error) throw error;

      const totalQuantity = data.reduce((sum, record) => sum + Number(record.quantity), 0);
      const totalAmount = data.reduce((sum, record) => sum + Number(record.total_amount), 0);
      const avgRate = totalQuantity > 0 ? totalAmount / totalQuantity : 0;

      // Daily breakdown
      const dailyData = data.reduce((acc, record) => {
        const date = record.collection_date;
        if (!acc[date]) {
          acc[date] = { date, quantity: 0, amount: 0, collections: 0 };
        }
        acc[date].quantity += Number(record.quantity);
        acc[date].amount += Number(record.total_amount);
        acc[date].collections += 1;
        return acc;
      }, {} as Record<string, any>);

      // Session breakdown
      const morningData = data.filter(record => record.session === 'morning');
      const eveningData = data.filter(record => record.session === 'evening');

      return {
        totalQuantity: Math.round(totalQuantity * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        avgRate: Math.round(avgRate * 100) / 100,
        totalCollections: data.length,
        dailyData: Object.values(dailyData).map(day => ({
          ...day,
          quantity: Math.round(day.quantity * 100) / 100,
          amount: Math.round(day.amount * 100) / 100
        })),
        sessionData: [
          { session: 'Morning', quantity: Math.round(morningData.reduce((sum, record) => sum + Number(record.quantity), 0) * 100) / 100, collections: morningData.length },
          { session: 'Evening', quantity: Math.round(eveningData.reduce((sum, record) => sum + Number(record.quantity), 0) * 100) / 100, collections: eveningData.length }
        ]
      };
    },
    enabled: !!farmer && open
  });

  if (!farmer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Farmer Analytics - {farmer.name} ({farmer.farmer_code})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Date Range Selector */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="from_date">From Date</Label>
                  <Input 
                    type="date" 
                    id="from_date" 
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="to_date">To Date</Label>
                  <Input 
                    type="date" 
                    id="to_date" 
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="flex justify-center p-8">Loading analytics...</div>
          ) : analytics ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
                    <Droplets className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {analytics.totalQuantity} L
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {analytics.totalCollections} collections
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                    <IndianRupee className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      ₹{analytics.totalAmount}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total earnings
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      ₹{analytics.avgRate}/L
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Per liter
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Collections</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      {analytics.totalCollections}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total entries
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Session Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Session Wise Collection</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.sessionData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="session" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="quantity" fill="#3b82f6" name="Quantity (L)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 space-y-2">
                    {analytics.sessionData.map((item) => (
                      <div key={item.session} className="flex justify-between items-center text-sm">
                        <span>{item.session}</span>
                        <div className="text-right">
                          <div className="font-medium">{item.quantity} L</div>
                          <div className="text-muted-foreground">{item.collections} collections</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              No data found for the selected date range
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};