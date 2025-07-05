
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface SchemeHeaderProps {
  onAddScheme: () => void;
}

export const SchemeHeader: React.FC<SchemeHeaderProps> = ({ onAddScheme }) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-medium">Milk Pricing Schemes</h3>
        <p className="text-sm text-muted-foreground">Configure different pricing schemes for customers</p>
      </div>
      
      <Button onClick={onAddScheme}>
        <Plus className="h-4 w-4 mr-2" />
        Add Scheme
      </Button>
    </div>
  );
};
