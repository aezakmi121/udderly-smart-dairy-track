import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Filter, History, TrendingDown } from 'lucide-react';
import { useFeedManagement } from '@/hooks/useFeedManagement';
import { format } from 'date-fns';
import { DataTable } from '@/components/common/DataTable';

export const FeedAllocationHistory = () => {
  const [dateFilter, setDateFilter] = useState('today');
  const [typeFilter, setTypeFilter] = useState('all');
  const { transactions, isLoading: transactionsLoading } = useFeedManagement();

  // Filter transactions to show only outgoing (allocations)
  const allocations = transactions?.filter(transaction => 
    transaction.transaction_type === 'outgoing'
  ) || [];

  // Apply filters
  const filteredAllocations = allocations.filter(allocation => {
    const today = new Date();
    const allocationDate = new Date(allocation.transaction_date);
    
    // Date filter
    let dateMatch = true;
    if (dateFilter === 'today') {
      dateMatch = allocationDate.toDateString() === today.toDateString();
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateMatch = allocationDate >= weekAgo;
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateMatch = allocationDate >= monthAgo;
    }
    
    // Type filter
    let typeMatch = true;
    if (typeFilter === 'daily') {
      typeMatch = allocation.notes?.includes('Daily feed allocation') || false;
    } else if (typeFilter === 'group') {
      typeMatch = allocation.notes?.includes('Group feeding') || false;
    }
    
    return dateMatch && typeMatch;
  });

  // Calculate total allocated quantity for today
  const todayAllocations = allocations.filter(allocation => {
    const today = new Date();
    const allocationDate = new Date(allocation.transaction_date);
    return allocationDate.toDateString() === today.toDateString();
  });

  const todayTotalQuantity = todayAllocations.reduce((sum, allocation) => sum + allocation.quantity, 0);

  const columns = [
    {
      key: 'transaction_date',
      label: 'Date',
      render: (value: any, allocation: any) => format(new Date(allocation.transaction_date), 'MMM dd, yyyy')
    },
    {
      key: 'feed_items',
      label: 'Feed Item',
      render: (value: any, allocation: any) => allocation.feed_items?.name || 'Unknown'
    },
    {
      key: 'quantity',
      label: 'Quantity',
      render: (value: any, allocation: any) => (
        <div className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-red-500" />
          <span className="font-medium">{allocation.quantity}</span>
          <span className="text-muted-foreground">{allocation.feed_items?.unit}</span>
        </div>
      )
    },
    {
      key: 'notes',
      label: 'Type',
      render: (value: any, allocation: any) => {
        const isGroupFeed = allocation.notes?.includes('Group feeding');
        const isDailyFeed = allocation.notes?.includes('Daily feed allocation');
        
        return (
          <Badge variant={isGroupFeed ? 'default' : isDailyFeed ? 'secondary' : 'outline'}>
            {isGroupFeed ? 'Group Feed' : isDailyFeed ? 'Daily Feed' : 'Other'}
          </Badge>
        );
      }
    },
    {
      key: 'supplier_name',
      label: 'Details',
      render: (value: any, allocation: any) => (
        <div className="text-sm text-muted-foreground">
          {allocation.notes || allocation.supplier_name}
        </div>
      )
    }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5" />
            <CardTitle>Feed Allocation History</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Calendar className="h-3 w-3" />
              Today: {todayTotalQuantity}kg allocated
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="daily">Daily Feed</SelectItem>
              <SelectItem value="group">Group Feed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DataTable
          data={filteredAllocations}
          columns={columns}
          isLoading={transactionsLoading}
          emptyMessage="No feed allocations found for the selected period."
        />

        {filteredAllocations.length > 0 && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground">
              <strong>Total allocated in selected period:</strong> {' '}
              {filteredAllocations.reduce((sum, allocation) => sum + allocation.quantity, 0)}kg
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};