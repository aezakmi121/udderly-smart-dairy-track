import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export interface TabConfig {
  id: string;
  label: string;
  component: React.ComponentType<any>;
  mobileLabel?: string;
}

interface BaseManagementProps {
  title: string;
  description: string;
  tabs: TabConfig[];
  defaultTab?: string;
  className?: string;
}

export const BaseManagement: React.FC<BaseManagementProps> = ({
  title,
  description,
  tabs,
  defaultTab,
  className = ""
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>

      <Tabs defaultValue={defaultTab || tabs[0]?.id} className="space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="flex w-max min-w-full gap-1">
            {tabs.map((tab) => (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id} 
                className="text-xs sm:text-sm"
              >
                {tab.mobileLabel || tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        
        {tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id}>
            <tab.component />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};