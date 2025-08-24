
import React from 'react';
import { BaseManagement, TabConfig } from '@/components/common/BaseManagement';
import { CowGroupsList } from './CowGroupsList';
import { GroupAssignments } from './GroupAssignments';
import { GroupingRecommendations } from './GroupingRecommendations';
import { GroupingSettings } from './GroupingSettings';
import { GroupBasedFeedManagement } from './GroupBasedFeedManagement';

const tabs: TabConfig[] = [
  { id: 'groups', label: 'Groups', component: CowGroupsList },
  { id: 'assignments', label: 'Assignments', component: GroupAssignments },
  { id: 'recommendations', label: 'Recommendations', mobileLabel: 'Recommendations', component: GroupingRecommendations },
  { id: 'group-feeding', label: 'Group Feeding', mobileLabel: 'Feeding', component: GroupBasedFeedManagement },
  { id: 'settings', label: 'Settings', component: GroupingSettings }
];

export const CowGroupingManagement = () => {
  return (
    <BaseManagement
      title="Cow Grouping Management"
      description="Manage cow groups, assignments, and automated grouping based on production metrics."
      tabs={tabs}
      defaultTab="groups"
    />
  );
};
