import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Baby, Heart } from 'lucide-react';

interface DeliveryWithCalfModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  isLoading?: boolean;
  record: any;
}

export const DeliveryWithCalfModal: React.FC<DeliveryWithCalfModalProps> = ({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  record
}) => {
  const [deliveryDate, setDeliveryDate] = useState(
    record?.actual_delivery_date || new Date().toISOString().split('T')[0]
  );
  const [calfGender, setCalfGender] = useState<'male' | 'female'>(record?.calf_gender || 'female');
  const [birthWeight, setBirthWeight] = useState('');
  const [calfNumber, setCalfNumber] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    const data = {
      aiRecordId: record.id,
      deliveryDate,
      calfGender,
      motherCowId: record.cow_id,
      birthWeight: birthWeight ? parseFloat(birthWeight) : undefined,
      calfNumber: calfNumber || undefined,
      notes: notes || undefined
    };
    
    onSubmit(data);
    
    // Reset form
    setDeliveryDate(new Date().toISOString().split('T')[0]);
    setCalfGender('female');
    setBirthWeight('');
    setCalfNumber('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Baby className="h-5 w-5" />
            Record Delivery & Create Calf
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          {/* Delivery Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-medium">
              <Heart className="h-5 w-5" />
              Delivery Information
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Mother Cow</Label>
                <Input 
                  value={record?.cows?.cow_number || 'N/A'} 
                  disabled 
                  className="bg-muted"
                />
              </div>
              
              <div>
                <Label>Service Number</Label>
                <Input 
                  value={record?.service_number || 'N/A'} 
                  disabled 
                  className="bg-muted"
                />
              </div>
              
              <div>
                <Label>Expected Delivery Date</Label>
                <Input 
                  value={record?.expected_delivery_date || 'N/A'} 
                  disabled 
                  className="bg-muted"
                />
              </div>
              
              <div>
                <Label htmlFor="delivery_date">Actual Delivery Date *</Label>
                <Input
                  id="delivery_date"
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Calf Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-medium">
              <Baby className="h-5 w-5" />
              Calf Information
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="calf_number">Calf Number</Label>
                <Input
                  id="calf_number"
                  value={calfNumber}
                  onChange={(e) => setCalfNumber(e.target.value)}
                  placeholder="Auto-generated if empty"
                />
              </div>
              
              <div>
                <Label htmlFor="calf_gender">Calf Gender *</Label>
                <Select value={calfGender} onValueChange={(value: 'male' | 'female') => setCalfGender(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="birth_weight">Birth Weight (kg)</Label>
                <Input
                  id="birth_weight"
                  type="number"
                  step="0.1"
                  value={birthWeight}
                  onChange={(e) => setBirthWeight(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              
              <div>
                <Label>Date of Birth</Label>
                <Input 
                  value={deliveryDate} 
                  disabled 
                  className="bg-muted"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes about the delivery or calf..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleSubmit} 
              disabled={isLoading || !deliveryDate || !calfGender}
              className="flex items-center gap-2"
            >
              {isLoading ? 'Processing...' : 'Record Delivery & Create Calf'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};