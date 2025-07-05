
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { POSSales } from './POSSales';
import { POSProducts } from './POSProducts';
import { POSCategories } from './POSCategories';
import { POSReports } from './POSReports';
import { POSInventory } from './POSInventory';

export const POSManagement = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">POS System</h1>
        <p className="text-muted-foreground">Point of Sale system for store management.</p>
      </div>

      <Tabs defaultValue="sales" className="space-y-6">
        <TabsList>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        
        <TabsContent value="sales">
          <POSSales />
        </TabsContent>
        
        <TabsContent value="products">
          <POSProducts />
        </TabsContent>
        
        <TabsContent value="categories">
          <POSCategories />
        </TabsContent>
        
        <TabsContent value="inventory">
          <POSInventory />
        </TabsContent>
        
        <TabsContent value="reports">
          <POSReports />
        </TabsContent>
      </Tabs>
    </div>
  );
};
