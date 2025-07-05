
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useCowGrouping } from '@/hooks/useCowGrouping';
import { CreateGroupDialog } from './CreateGroupDialog';
import { GroupCard } from './groups/GroupCard';
import { CowGroup } from './types';

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
          <GroupCard
            key={group.id}
            group={group as CowGroup}
            assignmentCount={getGroupAssignmentCount(group.id)}
          />
        ))}
      </div>

      <CreateGroupDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen} 
      />
    </div>
  );
};
