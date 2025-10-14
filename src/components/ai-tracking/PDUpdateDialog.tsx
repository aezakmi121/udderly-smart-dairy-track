import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PDUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: {
    id: string;
    cow_number: string;
    ai_date: string;
    service_number: number;
  } | null;
  onUpdate: (recordId: string, updates: any) => void;
  isLoading?: boolean;
}

export const PDUpdateDialog: React.FC<PDUpdateDialogProps> = ({
  open,
  onOpenChange,
  record,
  onUpdate,
  isLoading
}) => {
  const [pdResult, setPdResult] = useState('');
  const [pdDate, setPdDate] = useState(new Date().toISOString().split('T')[0]);

  const handleUpdate = () => {
    if (!record || !pdResult) return;
    
    onUpdate(record.id, {
      pd_done: true,
      pd_result: pdResult,
      pd_date: pdDate
    });
    
    // Reset form
    setPdResult('');
    setPdDate(new Date().toISOString().split('T')[0]);
  };

  if (!record) return null;

  const formattedDate = new Date(record.ai_date).toLocaleDateString();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update PD Status</DialogTitle>
          <DialogDescription>
            Complete the pregnancy diagnosis for this AI record to proceed with adding a new one.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1 text-sm">
              <p><strong>Cow:</strong> {record.cow_number}</p>
              <p><strong>AI Date:</strong> {formattedDate}</p>
              <p><strong>Service #:</strong> {record.service_number}</p>
            </div>
          </AlertDescription>
        </Alert>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="pd_date">PD Date</Label>
            <Input
              id="pd_date"
              type="date"
              value={pdDate}
              readOnly
              className="bg-muted"
            />
          </div>

          <div>
            <Label htmlFor="pd_result">PD Result</Label>
            <Select value={pdResult} onValueChange={setPdResult}>
              <SelectTrigger>
                <SelectValue placeholder="Select PD result" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
                <SelectItem value="inconclusive">Inconclusive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpdate} 
            disabled={!pdResult || isLoading}
          >
            {isLoading ? 'Updating...' : 'Update PD Status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
