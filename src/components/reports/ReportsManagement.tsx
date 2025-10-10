
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MilkCollectionReports } from './MilkCollectionReports';
import { MilkProductionReports } from './MilkProductionReports';
import { FeedReports } from './FeedReports';
import { CattleReports } from './CattleReports';
import { ExpenseReports } from './ExpenseReports';
import { IndividualCowPerformance } from './IndividualCowPerformance';
import { useUserPermissions } from '@/hooks/useUserPermissions';

export const ReportsManagement = () => {
  const { isAdmin, isFarmWorker } = useUserPermissions();

  // Determine default tab based on role
  const defaultTab = isFarmWorker ? 'production' : 'collection';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-muted-foreground">Generate detailed reports and view analytics.</p>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-2 md:grid-cols-6' : isFarmWorker ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-5'} h-auto gap-1 p-1`}>
          {!isFarmWorker && (
            <TabsTrigger value="collection" className="text-xs sm:text-sm">Milk Collection</TabsTrigger>
          )}
          <TabsTrigger value="production" className="text-xs sm:text-sm">Milk Production</TabsTrigger>
          <TabsTrigger value="feed" className="text-xs sm:text-sm">Feed Reports</TabsTrigger>
          <TabsTrigger value="cattle" className="text-xs sm:text-sm">Cattle Reports</TabsTrigger>
          <TabsTrigger value="individual" className="text-xs sm:text-sm">Individual Cow</TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="expenses" className="text-xs sm:text-sm">Expense Reports</TabsTrigger>
          )}
        </TabsList>
        
        {!isFarmWorker && (
          <TabsContent value="collection">
            <MilkCollectionReports />
          </TabsContent>
        )}
        
        <TabsContent value="production">
          <MilkProductionReports />
        </TabsContent>
        
        <TabsContent value="feed">
          <FeedReports />
        </TabsContent>
        
        <TabsContent value="cattle">
          <CattleReports />
        </TabsContent>
        
        <TabsContent value="individual">
          <IndividualCowPerformance />
        </TabsContent>
        
        {isAdmin && (
          <TabsContent value="expenses">
            <ExpenseReports />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
