
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CowGroupsList } from './CowGroupsList';
import { GroupAssignments } from './GroupAssignments';
import { GroupingRecommendations } from './GroupingRecommendations';
import { GroupingSettings } from './GroupingSettings';
import { GroupBasedFeedManagement } from './GroupBasedFeedManagement';

export const CowGroupingManagement = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cow Grouping Management</h1>
        <p className="text-muted-foreground">Manage cow groups, assignments, and automated grouping based on production metrics.</p>
      </div>

      <Tabs defaultValue="groups" className="space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="flex w-max min-w-full">
            <TabsTrigger value="groups">Groups</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            <TabsTrigger value="group-feeding">Group Feeding</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="groups">
          <CowGroupsList />
        </TabsContent>
        
        <TabsContent value="assignments">
          <GroupAssignments />
        </TabsContent>
        
        <TabsContent value="recommendations">
          <GroupingRecommendations />
        </TabsContent>
        
        <TabsContent value="group-feeding">
          <GroupBasedFeedManagement />
        </TabsContent>
        
        <TabsContent value="settings">
          <GroupingSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};
