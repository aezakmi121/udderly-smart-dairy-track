
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { UserPlus } from 'lucide-react';
import { useCowGrouping } from '@/hooks/useCowGrouping';
import { useCows } from '@/hooks/useCows';

export const GroupAssignments = () => {
  const [selectedCow, setSelectedCow] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const { cowGroups, groupAssignments, assignCowToGroupMutation, isLoading } = useCowGrouping();
  const { cows } = useCows();

  const handleAssignCow = async () => {
    if (!selectedCow || !selectedGroup) return;
    
    await assignCowToGroupMutation.mutateAsync({
      cowId: selectedCow,
      groupId: selectedGroup
    });
    
    setSelectedCow('');
    setSelectedGroup('');
  };

  const getAssignedCows = (groupId: string) => {
    return groupAssignments?.filter(assignment => assignment.group_id === groupId) || [];
  };

  const getUnassignedCows = () => {
    const assignedCowIds = groupAssignments?.map(assignment => assignment.cow_id) || [];
    return cows?.filter(cow => !assignedCowIds.includes(cow.id) && cow.status === 'active') || [];
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading assignments...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Assign Cow to Group</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Select value={selectedCow} onValueChange={setSelectedCow}>
                <SelectTrigger>
                  <SelectValue placeholder="Select cow to assign" />
                </SelectTrigger>
                <SelectContent>
                  {getUnassignedCows().map((cow) => (
                    <SelectItem key={cow.id} value={cow.id}>
                      {cow.cow_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target group" />
                </SelectTrigger>
                <SelectContent>
                  {cowGroups?.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.group_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleAssignCow}
              disabled={!selectedCow || !selectedGroup || assignCowToGroupMutation.isPending}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {assignCowToGroupMutation.isPending ? 'Assigning...' : 'Assign'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cowGroups?.map((group) => {
          const assignedCows = getAssignedCows(group.id);
          return (
            <Card key={group.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {group.group_name}
                  <Badge variant="outline">{assignedCows.length} cows</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {assignedCows.length > 0 ? (
                    assignedCows.map((assignment) => (
                      <div key={assignment.id} className="flex justify-between items-center p-2 bg-muted rounded">
                        <span className="font-medium">
                          {assignment.cows?.cow_number}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(assignment.assigned_date).toLocaleDateString()}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No cows assigned to this group
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {getUnassignedCows().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Unassigned Cows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {getUnassignedCows().map((cow) => (
                <Badge key={cow.id} variant="outline">
                  {cow.cow_number}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
