
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';

interface CowGroup {
  id: string;
  group_name: string;
  description: string | null;
  min_yield: number | null;
  max_yield: number | null;
  min_days_in_milk: number | null;
  max_days_in_milk: number | null;
  feed_requirements: Record<string, number> | null;
}

interface GroupCardProps {
  group: CowGroup;
  assignmentCount: number;
}

export const GroupCard: React.FC<GroupCardProps> = ({ group, assignmentCount }) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{group.group_name}</CardTitle>
          <Badge variant="outline">
            <Users className="h-3 w-3 mr-1" />
            {assignmentCount}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{group.description}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {(group.min_yield || group.max_yield) && (
            <div>
              <h4 className="font-medium text-sm">Yield Criteria</h4>
              <p className="text-sm text-muted-foreground">
                {group.min_yield && group.max_yield 
                  ? `${group.min_yield}L - ${group.max_yield}L per day`
                  : group.min_yield 
                  ? `> ${group.min_yield}L per day`
                  : `< ${group.max_yield}L per day`
                }
              </p>
            </div>
          )}

          {(group.min_days_in_milk || group.max_days_in_milk) && (
            <div>
              <h4 className="font-medium text-sm">Days in Milk</h4>
              <p className="text-sm text-muted-foreground">
                {group.min_days_in_milk && group.max_days_in_milk 
                  ? `${group.min_days_in_milk} - ${group.max_days_in_milk} days`
                  : group.min_days_in_milk 
                  ? `> ${group.min_days_in_milk} days`
                  : `< ${group.max_days_in_milk} days`
                }
              </p>
            </div>
          )}

          {group.feed_requirements && (
            <div>
              <h4 className="font-medium text-sm">Daily Feed Requirements</h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                {Object.entries(group.feed_requirements).map(([feed, amount]) => (
                  <div key={feed} className="flex justify-between">
                    <span className="capitalize">{feed}:</span>
                    <span>{amount}kg</span>
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
