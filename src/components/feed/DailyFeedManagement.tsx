
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Utensils } from 'lucide-react';
import { useFeedManagement } from '@/hooks/useFeedManagement';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const DailyFeedManagement = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFeedItem, setSelectedFeedItem] = useState('');
  const [dailyQuantity, setDailyQuantity] = useState('');
  const { feedItems, isLoading, createTransactionMutation } = useFeedManagement();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
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
        supplier_name: 'Daily Feed Usage'
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

  const availableFeedItems = feedItems?.filter(item => item.current_stock > 0) || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Utensils className="h-5 w-5" />
            <CardTitle>Daily Feed Management</CardTitle>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="whitespace-nowrap">
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Allocate </span>Feed
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Allocate Daily Feed</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Feed Item</Label>
                  <Select value={selectedFeedItem} onValueChange={setSelectedFeedItem}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select feed item" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFeedItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} (Stock: {item.current_stock} {item.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Daily Quantity</Label>
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
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-4">
              Use this section to allocate daily feed amounts to your cows. The allocated quantity will be automatically deducted from your feed stock.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableFeedItems.map((item) => (
                <div key={item.id} className="p-3 border rounded-lg">
                  <h4 className="font-medium">{item.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    Available: {item.current_stock} {item.unit}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
