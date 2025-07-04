
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const CattleReports = () => {
  // Placeholder data
  const weightData = [
    { month: 'Jan', avgWeight: 450 },
    { month: 'Feb', avgWeight: 465 },
    { month: 'Mar', avgWeight: 470 },
    { month: 'Apr', avgWeight: 485 },
    { month: 'May', avgWeight: 490 },
    { month: 'Jun', avgWeight: 505 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Cattle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">45</div>
            <p className="text-sm text-muted-foreground">Active cattle</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Milking Cows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">32</div>
            <p className="text-sm text-muted-foreground">Currently milking</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pregnant Cows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">8</div>
            <p className="text-sm text-muted-foreground">Expecting calves</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Calves</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">12</div>
            <p className="text-sm text-muted-foreground">Young calves</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Average Weight Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="avgWeight" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Average Weight (kg)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Health & Vaccination Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">42</div>
              <p className="text-sm text-muted-foreground">Up to date</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">3</div>
              <p className="text-sm text-muted-foreground">Due soon</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">0</div>
              <p className="text-sm text-muted-foreground">Overdue</p>
            </div>
          </div>
          <div className="mt-4">
            <Button>Generate Vaccination Schedule</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
