
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CowGroup } from '../types';

interface GroupCardProps {
  group: CowGroup;
  assignmentCount: number;
}

export const GroupCard: React.FC<GroupCardProps> = ({
  group,
  assignmentCount
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{group.group_name}</CardTitle>
          <Badge variant={group.is_active ? "default" : "secondary"}>
            {group.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
        {group.description && (
          <p className="text-sm text-muted-foreground">{group.description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Assigned Cows:</span>
            <span className="font-medium">{assignmentCount}</span>
          </div>
          
          {(group.min_yield || group.max_yield) && (
            <div className="flex justify-between text-sm">
              <span>Yield Range:</span>
              <span className="font-medium">
                {group.min_yield || 0}L - {group.max_yield || '∞'}L
              </span>
            </div>
          )}
          
          {(group.min_days_in_milk || group.max_days_in_milk) && (
            <div className="flex justify-between text-sm">
              <span>Days in Milk:</span>
              <span className="font-medium">
                {group.min_days_in_milk || 0} - {group.max_days_in_milk || '∞'} days
              </span>
            </div>
          )}
          
          {group.feed_requirements && (
            <div className="mt-3">
              <p className="text-sm font-medium mb-1">Feed Requirements:</p>
              <div className="text-xs space-y-1">
                {Object.entries(group.feed_requirements as Record<string, any>).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="capitalize">{key}:</span>
                    <span>{value} kg</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
