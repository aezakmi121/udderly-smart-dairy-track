
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, Utensils } from 'lucide-react';
import { useCowGrouping } from '@/hooks/useCowGrouping';
import { useFeedManagement } from '@/hooks/useFeedManagement';
import { useToast } from '@/hooks/use-toast';

export const GroupBasedFeedManagement = () => {
  const [selectedGroup, setSelectedGroup] = useState('');
  const [feedAllocations, setFeedAllocations] = useState<{[key: string]: string}>({});
  const { cowGroups, groupAssignments, isLoading: groupsLoading } = useCowGrouping();
  const { feedItems, addTransactionMutation } = useFeedManagement();
  const { toast } = useToast();

  const getGroupCowCount = (groupId: string) => {
    return groupAssignments?.filter(assignment => assignment.group_id === groupId).length || 0;
  };

  const getSelectedGroup = () => {
    return cowGroups?.find(group => group.id === selectedGroup);
  };

  const handleFeedAllocationChange = (feedType: string, amount: string) => {
    setFeedAllocations(prev => ({
      ...prev,
      [feedType]: amount
    }));
  };

  const allocateGroupFeed = async () => {
    const group = getSelectedGroup();
    if (!group || !group.feed_requirements) {
      toast({
        title: "Error",
        description: "Please select a group with defined feed requirements",
        variant: "destructive"
      });
      return;
    }

    const cowCount = getGroupCowCount(selectedGroup);
    if (cowCount === 0) {
      toast({
        title: "No cows in group",
        description: "This group has no assigned cows",
        variant: "destructive"
      });
      return;
    }

    const feedRequirements = group.feed_requirements as Record<string, number>;
    const transactions = [];

    // Create transactions for each feed type
    for (const [feedType, perCowAmount] of Object.entries(feedRequirements)) {
      const totalAmount = perCowAmount * cowCount;
      const customAmount = feedAllocations[feedType];
      const finalAmount = customAmount ? parseFloat(customAmount) : totalAmount;

      // Find matching feed item
      const feedItem = feedItems?.find(item => 
        item.name.toLowerCase().includes(feedType.toLowerCase())
      );

      if (!feedItem) {
        toast({
          title: "Feed item not found",
          description: `Could not find feed item for ${feedType}`,
          variant: "destructive"
        });
        continue;
      }

      if (feedItem.current_stock < finalAmount) {
        toast({
          title: "Insufficient stock",
          description: `Not enough ${feedItem.name} in stock. Available: ${feedItem.current_stock} ${feedItem.unit}`,
          variant: "destructive"
        });
        continue;
      }

      transactions.push({
        feed_item_id: feedItem.id,
        transaction_type: 'outgoing' as const,
        quantity: finalAmount,
        transaction_date: new Date().toISOString().split('T')[0],
        notes: `Group feeding: ${group.group_name} (${cowCount} cows)`,
        supplier_name: 'Group Feed Allocation'
      });
    }

    // Execute all transactions
    try {
      for (const transaction of transactions) {
        await addTransactionMutation.mutateAsync(transaction);
      }
      
      toast({
        title: "Group feed allocated successfully!",
        description: `Fed ${cowCount} cows in ${group.group_name}. Feed deducted from daily management.`
      });
      
      setFeedAllocations({});
    } catch (error: any) {
      toast({
        title: "Failed to allocate group feed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (groupsLoading) {
    return <div className="text-center py-4">Loading group feed management...</div>;
  }

  const selectedGroupData = getSelectedGroup();
  const cowCount = selectedGroup ? getGroupCowCount(selectedGroup) : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Utensils className="h-5 w-5" />
            Group-Based Feed Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Allocate feed to entire cow groups based on their defined feed requirements and number of cows. 
            Feed will be automatically deducted from your daily feed management stock.
          </p>

          <div className="space-y-4">
            <div>
              <Label>Select Cow Group</Label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a cow group" />
                </SelectTrigger>
                <SelectContent>
                  {cowGroups?.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{group.group_name}</span>
                        <Badge variant="outline" className="ml-2">
                          <Users className="h-3 w-3 mr-1" />
                          {getGroupCowCount(group.id)}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedGroupData && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {selectedGroupData.group_name} - Feed Allocation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Cows in group: {cowCount}</span>
                      <span>•</span>
                      <span>Feed requirements per cow per day</span>
                    </div>

                    {selectedGroupData.feed_requirements && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.entries(selectedGroupData.feed_requirements as Record<string, number>).map(([feedType, perCowAmount]) => {
                          const totalAmount = perCowAmount * cowCount;
                          const feedItem = feedItems?.find(item => 
                            item.name.toLowerCase().includes(feedType.toLowerCase())
                          );

                          return (
                            <div key={feedType} className="space-y-2">
                              <Label className="capitalize">{feedType}</Label>
                              <div className="text-sm text-muted-foreground">
                                Per cow: {perCowAmount}kg • Total: {totalAmount}kg
                              </div>
                              {feedItem && (
                                <div className="text-xs text-muted-foreground">
                                  Available: {feedItem.current_stock} {feedItem.unit}
                                </div>
                              )}
                              <Input
                                type="number"
                                step="0.1"
                                placeholder={`${totalAmount}`}
                                value={feedAllocations[feedType] || ''}
                                onChange={(e) => handleFeedAllocationChange(feedType, e.target.value)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <Button 
                      onClick={allocateGroupFeed}
                      disabled={!selectedGroup || cowCount === 0 || addTransactionMutation.isPending}
                      className="w-full"
                    >
                      {addTransactionMutation.isPending 
                        ? 'Allocating Feed...' 
                        : `Allocate Feed to ${cowCount} Cows`
                      }
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Group overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cowGroups?.map((group) => {
          const cowCount = getGroupCowCount(group.id);
          return (
            <Card key={group.id} className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedGroup(group.id)}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {group.group_name}
                  <Badge variant="outline">
                    <Users className="h-3 w-3 mr-1" />
                    {cowCount}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {group.feed_requirements && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Daily Feed per Cow</h4>
                    <div className="grid grid-cols-2 gap-1 text-sm text-muted-foreground">
                      {Object.entries(group.feed_requirements as Record<string, number>).map(([feed, amount]) => (
                        <div key={feed} className="flex justify-between">
                          <span className="capitalize">{feed}:</span>
                          <span>{amount}kg</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
