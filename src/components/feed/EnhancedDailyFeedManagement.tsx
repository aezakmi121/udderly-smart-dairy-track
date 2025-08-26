import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Utensils, Users, Package, TrendingDown, AlertCircle } from 'lucide-react';
import { useFeedManagement } from '@/hooks/useFeedManagement';
import { useCowGrouping } from '@/hooks/useCowGrouping';
import { useToast } from '@/hooks/use-toast';
import { FeedAllocationHistory } from './FeedAllocationHistory';

export const EnhancedDailyFeedManagement = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFeedItem, setSelectedFeedItem] = useState('');
  const [dailyQuantity, setDailyQuantity] = useState('');
  const [activeTab, setActiveTab] = useState('manual');
  
  // Group allocation states
  const [selectedGroup, setSelectedGroup] = useState('');
  const [groupFeedAllocations, setGroupFeedAllocations] = useState<{[key: string]: string}>({});
  
  const { feedItems, isLoading, createTransactionMutation } = useFeedManagement();
  const { cowGroups, groupAssignments } = useCowGrouping();
  const { toast } = useToast();

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFeedItem || !dailyQuantity) {
      toast({ 
        title: "Missing information", 
        description: "Please select a feed item and enter quantity",
        variant: "destructive" 
      });
      return;
    }

    const quantity = parseFloat(dailyQuantity);
    const feedItem = feedItems?.find(item => item.id === selectedFeedItem);
    
    if (!feedItem) {
      toast({ 
        title: "Error", 
        description: "Feed item not found",
        variant: "destructive" 
      });
      return;
    }

    if (feedItem.current_stock < quantity) {
      toast({ 
        title: "Insufficient stock", 
        description: `Only ${feedItem.current_stock} ${feedItem.unit} available`,
        variant: "destructive" 
      });
      return;
    }

    try {
      await createTransactionMutation.mutateAsync({
        feed_item_id: selectedFeedItem,
        transaction_type: 'outgoing',
        quantity: quantity,
        transaction_date: new Date().toISOString().split('T')[0],
        notes: 'Daily feed allocation',
        supplier_name: 'Manual Daily Feed'
      });

      toast({ title: "Daily feed allocated successfully!" });
      setIsDialogOpen(false);
      setSelectedFeedItem('');
      setDailyQuantity('');
    } catch (error: any) {
      toast({ 
        title: "Failed to allocate daily feed", 
        description: error.message,
        variant: "destructive" 
      });
    }
  };

  const getGroupCowCount = (groupId: string) => {
    return groupAssignments?.filter(assignment => assignment.group_id === groupId).length || 0;
  };

  const handleGroupFeedSubmit = async () => {
    const group = cowGroups?.find(g => g.id === selectedGroup);
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

    for (const [feedType, perCowAmount] of Object.entries(feedRequirements)) {
      const totalAmount = perCowAmount * cowCount;
      const customAmount = groupFeedAllocations[feedType];
      const finalAmount = customAmount ? parseFloat(customAmount) : totalAmount;

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

    try {
      for (const transaction of transactions) {
        await createTransactionMutation.mutateAsync(transaction);
      }
      
      toast({
        title: "Group feed allocated successfully!",
        description: `Fed ${cowCount} cows in ${group.group_name}`
      });
      
      setIsDialogOpen(false);
      setSelectedGroup('');
      setGroupFeedAllocations({});
    } catch (error: any) {
      toast({
        title: "Failed to allocate group feed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const availableFeedItems = feedItems?.filter(item => item.current_stock > 0) || [];
  const lowStockItems = feedItems?.filter(item => 
    item.current_stock <= (item.minimum_stock_level || 0) && item.current_stock > 0
  ) || [];

  return (
    <div className="space-y-6">
      {/* Stock Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Available Items</p>
                <p className="text-2xl font-bold">{availableFeedItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Low Stock Items</p>
                <p className="text-2xl font-bold">{lowStockItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Active Groups</p>
                <p className="text-2xl font-bold">{cowGroups?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feed Allocation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Utensils className="h-5 w-5" />
              <CardTitle>Daily Feed Allocation</CardTitle>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Allocate Feed
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Allocate Daily Feed</DialogTitle>
                </DialogHeader>
                
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="manual">Manual Allocation</TabsTrigger>
                    <TabsTrigger value="group">Group Allocation</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="manual" className="space-y-4">
                    <form onSubmit={handleManualSubmit} className="space-y-4">
                      <div>
                        <Label>Feed Item</Label>
                        <Select value={selectedFeedItem} onValueChange={setSelectedFeedItem}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select feed item" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableFeedItems.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{item.name}</span>
                                  <Badge variant="outline" className="ml-2">
                                    {item.current_stock} {item.unit}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="Enter quantity"
                          value={dailyQuantity}
                          onChange={(e) => setDailyQuantity(e.target.value)}
                          required
                        />
                        {selectedFeedItem && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Unit: {availableFeedItems.find(item => item.id === selectedFeedItem)?.unit}
                          </p>
                        )}
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createTransactionMutation.isPending}>
                          {createTransactionMutation.isPending ? 'Allocating...' : 'Allocate Feed'}
                        </Button>
                      </div>
                    </form>
                  </TabsContent>
                  
                  <TabsContent value="group" className="space-y-4">
                    <div>
                      <Label>Select Group</Label>
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

                    {selectedGroup && cowGroups?.find(g => g.id === selectedGroup)?.feed_requirements && (
                      <div className="space-y-4">
                        <div className="text-sm text-muted-foreground">
                          Cows in group: {getGroupCowCount(selectedGroup)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Object.entries(cowGroups.find(g => g.id === selectedGroup)?.feed_requirements as Record<string, number>).map(([feedType, perCowAmount]) => {
                            const cowCount = getGroupCowCount(selectedGroup);
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
                                  value={groupFeedAllocations[feedType] || ''}
                                  onChange={(e) => setGroupFeedAllocations(prev => ({
                                    ...prev,
                                    [feedType]: e.target.value
                                  }))}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleGroupFeedSubmit}
                        disabled={!selectedGroup || createTransactionMutation.isPending}
                      >
                        {createTransactionMutation.isPending ? 'Allocating...' : 'Allocate Group Feed'}
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading feed items...</div>
          ) : availableFeedItems.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No feed items with available stock found.
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Allocate daily feed amounts manually or by cow groups. All allocations are automatically tracked and deducted from stock.
              </p>
              
              {/* Low stock warning */}
              {lowStockItems.length > 0 && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2 text-orange-800">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Low Stock Alert</span>
                  </div>
                  <p className="text-sm text-orange-700 mt-1">
                    {lowStockItems.length} feed item(s) are running low on stock.
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableFeedItems.map((item) => (
                  <div key={item.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{item.name}</h4>
                      {item.current_stock <= (item.minimum_stock_level || 0) && (
                        <Badge variant="destructive" className="text-xs">
                          Low Stock
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Available: {item.current_stock} {item.unit}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Min Level: {item.minimum_stock_level || 0} {item.unit}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feed Allocation History */}
      <FeedAllocationHistory />
    </div>
  );
};