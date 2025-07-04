
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MilkRateSettings } from './MilkRateSettings';

export const SettingsManagement = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure system settings and rates.</p>
      </div>

      <Tabs defaultValue="milk-rates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="milk-rates">Milk Rate Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="milk-rates">
          <MilkRateSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};
