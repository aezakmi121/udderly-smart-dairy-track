
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MilkCollectionReports } from './MilkCollectionReports';
import { MilkProductionReports } from './MilkProductionReports';
import { FeedReports } from './FeedReports';
import { CattleReports } from './CattleReports';

export const ReportsManagement = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-muted-foreground">Generate detailed reports and view analytics.</p>
      </div>

      <Tabs defaultValue="collection" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto gap-1 p-1">
          <TabsTrigger value="collection" className="text-xs sm:text-sm">Milk Collection</TabsTrigger>
          <TabsTrigger value="production" className="text-xs sm:text-sm">Milk Production</TabsTrigger>
          <TabsTrigger value="feed" className="text-xs sm:text-sm">Feed Reports</TabsTrigger>
          <TabsTrigger value="cattle" className="text-xs sm:text-sm">Cattle Reports</TabsTrigger>
          <TabsTrigger value="expenses" className="text-xs sm:text-sm">Expense Reports</TabsTrigger>
        </TabsList>
        
        <TabsContent value="collection">
          <MilkCollectionReports />
        </TabsContent>
        
        <TabsContent value="production">
          <MilkProductionReports />
        </TabsContent>
        
        <TabsContent value="feed">
          <FeedReports />
        </TabsContent>
        
        <TabsContent value="cattle">
          <CattleReports />
        </TabsContent>
        
        <TabsContent value="expenses">
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Expense Reports</h3>
            <p className="text-muted-foreground">Expense reporting features coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
