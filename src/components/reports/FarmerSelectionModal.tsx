import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Farmer {
  farmer_id: string;
  farmer_code: string;
  farmer_name: string;
  total_quantity: number;
  total_amount: number;
}

interface FarmerSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  farmers: Farmer[];
  onDownload: (selectedFarmers: Farmer[]) => void;
}

export const FarmerSelectionModal: React.FC<FarmerSelectionModalProps> = ({
  isOpen,
  onClose,
  farmers,
  onDownload
}) => {
  const [selectedFarmers, setSelectedFarmers] = useState<Set<string>>(new Set());

  // Update selectedFarmers when farmers prop changes (select all by default)
  useEffect(() => {
    setSelectedFarmers(new Set(farmers.map(f => f.farmer_id)));
  }, [farmers]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFarmers(new Set(farmers.map(f => f.farmer_id)));
    } else {
      setSelectedFarmers(new Set());
    }
  };

  const handleFarmerToggle = (farmerId: string) => {
    const newSelected = new Set(selectedFarmers);
    if (newSelected.has(farmerId)) {
      newSelected.delete(farmerId);
    } else {
      newSelected.add(farmerId);
    }
    setSelectedFarmers(newSelected);
  };

  const handleDownload = () => {
    const selected = farmers.filter(f => selectedFarmers.has(f.farmer_id));
    onDownload(selected);
    onClose();
  };

  const selectedCount = selectedFarmers.size;
  const isAllSelected = selectedCount === farmers.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Farmers for Payout PDF</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="select-all"
              checked={isAllSelected}
              onCheckedChange={handleSelectAll}
            />
            <label htmlFor="select-all" className="text-sm font-medium">
              Select All ({farmers.length} farmers)
            </label>
          </div>

          <ScrollArea className="h-64 border rounded-md p-2">
            <div className="space-y-2">
              {farmers.map((farmer) => (
                <div key={farmer.farmer_id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded">
                  <Checkbox
                    id={farmer.farmer_id}
                    checked={selectedFarmers.has(farmer.farmer_id)}
                    onCheckedChange={() => handleFarmerToggle(farmer.farmer_id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {farmer.farmer_code} - {farmer.farmer_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {farmer.total_quantity.toFixed(2)} L | ₹{farmer.total_amount.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="text-sm text-muted-foreground">
            Selected: {selectedCount} farmers
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleDownload} 
              disabled={selectedCount === 0}
              className="flex-1"
            >
              Download PDF ({selectedCount})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};