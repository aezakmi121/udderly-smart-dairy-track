import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export interface TabConfig {
  id: string;
  label: string;
  component: React.ComponentType<any>;
  mobileLabel?: string;
}

interface ManagementLayoutProps {
  title: string;
  description?: string;
  tabs: TabConfig[];
  defaultTab?: string;
  className?: string;
}

export const ManagementLayout: React.FC<ManagementLayoutProps> = ({
  title,
  description,
  tabs,
  defaultTab,
  className = ""
}) => {
  return (
    <div className={`space-y-4 sm:space-y-6 ${className}`}>
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-sm sm:text-base text-muted-foreground mt-1">{description}</p>}
      </div>

      <Tabs defaultValue={defaultTab || tabs[0]?.id} className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-max min-w-full gap-1 p-1">
            {tabs.map((tab) => (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id} 
                className="text-xs sm:text-sm px-2 sm:px-3 py-1.5"
              >
                <span className="sm:hidden">{tab.mobileLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        
        {tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="mt-4 sm:mt-6">
            <tab.component />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};