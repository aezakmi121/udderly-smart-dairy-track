
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MilkReports } from './MilkReports';
import { FeedReports } from './FeedReports';
import { CattleReports } from './CattleReports';

export const ReportsManagement = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-muted-foreground">Generate detailed reports and view analytics.</p>
      </div>

      <Tabs defaultValue="milk" className="space-y-6">
        <TabsList>
          <TabsTrigger value="milk">Milk Reports</TabsTrigger>
          <TabsTrigger value="feed">Feed Reports</TabsTrigger>
          <TabsTrigger value="cattle">Cattle Reports</TabsTrigger>
        </TabsList>
        
        <TabsContent value="milk">
          <MilkReports />
        </TabsContent>
        
        <TabsContent value="feed">
          <FeedReports />
        </TabsContent>
        
        <TabsContent value="cattle">
          <CattleReports />
        </TabsContent>
      </Tabs>
    </div>
  );
};
