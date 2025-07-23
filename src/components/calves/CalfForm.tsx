
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCows } from '@/hooks/useCows';

interface Calf {
  id: string;
  calf_number?: string;
  gender: 'male' | 'female';
  date_of_birth: string;
  date_of_conception?: string;
  mother_cow_id?: string;
  breed?: string;
  birth_weight?: number;
  status?: 'alive' | 'dead' | 'sold';
  image_url?: string;
  notes?: string;
}

interface CalfFormProps {
  selectedCalf: Calf | null;
  setSelectedCalf: (calf: Calf | null) => void;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const CalfForm: React.FC<CalfFormProps> = ({
  selectedCalf,
  setSelectedCalf,
  onSubmit,
  onCancel,
  isLoading
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { cows } = useCows();

  const handleImageUpload = async (file: File, calfId?: string) => {
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `calf-${Date.now()}.${fileExt}`;
      const filePath = `calves/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('cow-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('cow-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      toast({ title: "Error uploading image", variant: "destructive" });
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const calfData = {
      calf_number: formData.get('calf_number') as string,
      gender: formData.get('gender') as 'male' | 'female',
      date_of_birth: formData.get('date_of_birth') as string,
      date_of_conception: formData.get('date_of_conception') as string || null,
      mother_cow_id: formData.get('mother_cow_id') as string === 'none' ? null : formData.get('mother_cow_id') as string,
      breed: formData.get('breed') as string,
      birth_weight: parseFloat(formData.get('birth_weight') as string) || null,
      status: formData.get('status') as 'alive' | 'dead' | 'sold',
      notes: formData.get('notes') as string,
      image_url: selectedCalf?.image_url || null
    };

    onSubmit(calfData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="calf_number">Calf Number</Label>
          <Input
            id="calf_number"
            name="calf_number"
            defaultValue={selectedCalf?.calf_number || ''}
          />
        </div>
        
        <div>
          <Label htmlFor="gender">Gender *</Label>
          <Select name="gender" defaultValue={selectedCalf?.gender || 'male'} required>
            <SelectTrigger>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="date_of_birth">Date of Birth *</Label>
          <Input
            id="date_of_birth"
            name="date_of_birth"
            type="date"
            defaultValue={selectedCalf?.date_of_birth || ''}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="date_of_conception">Date of Conception</Label>
          <Input
            id="date_of_conception"
            name="date_of_conception"
            type="date"
            defaultValue={selectedCalf?.date_of_conception || ''}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="mother_cow_id">Mother Cow</Label>
        <Select name="mother_cow_id" defaultValue={selectedCalf?.mother_cow_id || 'none'}>
          <SelectTrigger>
            <SelectValue placeholder="Select mother cow" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No mother selected</SelectItem>
            {cows?.map((cow) => (
              <SelectItem key={cow.id} value={cow.id}>
                {cow.cow_number}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="breed">Breed</Label>
          <Input
            id="breed"
            name="breed"
            defaultValue={selectedCalf?.breed || ''}
          />
        </div>
        
        <div>
          <Label htmlFor="birth_weight">Birth Weight (kg)</Label>
          <Input
            id="birth_weight"
            name="birth_weight"
            type="number"
            step="0.1"
            defaultValue={selectedCalf?.birth_weight || ''}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="status">Status</Label>
        <Select name="status" defaultValue={selectedCalf?.status || 'alive'}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alive">Alive</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
            <SelectItem value="dead">Dead</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="image">Calf Image</Label>
        <div className="mt-2">
          {selectedCalf?.image_url && (
            <img 
              src={selectedCalf.image_url} 
              alt="Calf" 
              className="w-24 h-24 object-cover rounded-lg mb-2"
            />
          )}
          <Input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file && selectedCalf) {
                const imageUrl = await handleImageUpload(file, selectedCalf.id);
                setSelectedCalf({ ...selectedCalf, image_url: imageUrl });
              }
            }}
            disabled={isUploading}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={selectedCalf?.notes || ''}
          rows={3}
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {selectedCalf ? 'Update' : 'Add'} Calf
        </Button>
      </div>
    </form>
  );
};
