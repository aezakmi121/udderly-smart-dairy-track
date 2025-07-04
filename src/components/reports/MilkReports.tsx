
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const MilkReports = () => {
  // Placeholder data - in real app, this would come from API
  const mockData = [
    { month: 'Jan', production: 1200, collection: 800 },
    { month: 'Feb', production: 1350, collection: 900 },
    { month: 'Mar', production: 1180, collection: 850 },
    { month: 'Apr', production: 1400, collection: 950 },
    { month: 'May', production: 1250, collection: 800 },
    { month: 'Jun', production: 1500, collection: 1000 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Production</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">8,880 L</div>
            <p className="text-sm text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Collection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">5,300 L</div>
            <p className="text-sm text-muted-foreground">From farmers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Average Fat %</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">4.2%</div>
            <p className="text-sm text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Production vs Collection Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="production" fill="#3b82f6" name="Production (L)" />
                <Bar dataKey="collection" fill="#10b981" name="Collection (L)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generate Custom Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="from_date">From Date</Label>
              <Input type="date" id="from_date" />
            </div>
            <div>
              <Label htmlFor="to_date">To Date</Label>
              <Input type="date" id="to_date" />
            </div>
            <div className="flex items-end">
              <Button>Generate Report</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
