
import React from 'react';
import { BaseManagement, TabConfig } from '@/components/common/BaseManagement';
import { FeedCategories } from './FeedCategories';
import { FeedItems } from './FeedItems';
import { FeedTransactions } from './FeedTransactions';
import { FeedStock } from './FeedStock';
import { DailyFeedManagement } from './DailyFeedManagement';

const tabs: TabConfig[] = [
  { id: 'stock', label: 'Stock Overview', component: FeedStock },
  { id: 'daily-feed', label: 'Daily Feed', component: DailyFeedManagement },
  { id: 'transactions', label: 'Transactions', component: FeedTransactions },
  { id: 'items', label: 'Feed Items', component: FeedItems },
  { id: 'categories', label: 'Categories', component: FeedCategories }
];

export const FeedManagement = () => {
  return (
    <BaseManagement
      title="Feed & Stock Management"
      description="Manage feed categories, items, and stock transactions."
      tabs={tabs}
      defaultTab="stock"
    />
  );
};
