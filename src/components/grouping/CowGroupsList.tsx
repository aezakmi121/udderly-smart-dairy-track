
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Settings } from 'lucide-react';
import { useCowGrouping } from '@/hooks/useCowGrouping';
import { CreateGroupDialog } from './CreateGroupDialog';

export const CowGroupsList = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { cowGroups, groupAssignments, isLoading } = useCowGrouping();

  const getGroupAssignmentCount = (groupId: string) => {
    return groupAssignments?.filter(assignment => assignment.group_id === groupId).length || 0;
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading cow groups...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Cow Groups</h2>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cowGroups?.map((group) => (
          <Card key={group.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{group.group_name}</CardTitle>
                <Badge variant="outline">
                  <Users className="h-3 w-3 mr-1" />
                  {getGroupAssignmentCount(group.id)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{group.description}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Yield criteria */}
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

                {/* Days in milk criteria */}
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

                {/* Feed requirements */}
                {group.feed_requirements && (
                  <div>
                    <h4 className="font-medium text-sm">Daily Feed Requirements</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                      {Object.entries(group.feed_requirements as any).map(([feed, amount]) => (
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
        ))}
      </div>

      <CreateGroupDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen} 
      />
    </div>
  );
};
