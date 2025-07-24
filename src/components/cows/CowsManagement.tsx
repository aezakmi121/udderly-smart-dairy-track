
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Image, Trash2, Baby, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCalves } from '@/hooks/useCalves';
import { CalfDetailsDialog } from './CalfDetailsDialog';
import { CowDetailsModal } from './CowDetailsModal';

interface Cow {
  id: string;
  cow_number: string;
  breed?: string;
  date_of_birth?: string;
  date_of_arrival: string;
  status?: 'active' | 'dry' | 'pregnant' | 'sick' | 'sold' | 'dead';
  image_url?: string;
  estimated_milk_capacity?: number;
  current_month_yield?: number;
  lifetime_yield?: number;
  last_calving_date?: string;
  notes?: string;
}

export const CowsManagement = () => {
  const [selectedCow, setSelectedCow] = useState<Cow | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [calfDialogOpen, setCalfDialogOpen] = useState(false);
  const [selectedCowForCalves, setSelectedCowForCalves] = useState<Cow | null>(null);
  const [cowDetailsOpen, setCowDetailsOpen] = useState(false);
  const [selectedCowForDetails, setSelectedCowForDetails] = useState<Cow | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { calves } = useCalves();

  const { data: cows, isLoading } = useQuery({
    queryKey: ['cows'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cows')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Cow[];
    }
  });

  const addCowMutation = useMutation({
    mutationFn: async (newCow: Omit<Cow, 'id'>) => {
      const { data, error } = await supabase
        .from('cows')
        .insert(newCow)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cows'] });
      setIsDialogOpen(false);
      setSelectedCow(null);
      toast({ title: "Cow added successfully!" });
    }
  });

  const updateCowMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Cow> & { id: string }) => {
      const { data, error } = await supabase
        .from('cows')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cows'] });
      setIsDialogOpen(false);
      setSelectedCow(null);
      toast({ title: "Cow updated successfully!" });
    }
  });

  const deleteCowMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cows')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cows'] });
      toast({ title: "Cow deleted successfully!" });
    }
  });

  const handleImageUpload = async (file: File, cowId?: string) => {
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `cow-${Date.now()}.${fileExt}`;
      const filePath = `cows/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('cow-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('cow-images')
        .getPublicUrl(filePath);

      if (cowId) {
        await updateCowMutation.mutateAsync({ id: cowId, image_url: publicUrl });
      }

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
    
    const cowData = {
      cow_number: formData.get('cow_number') as string,
      breed: formData.get('breed') as string,
      date_of_birth: formData.get('date_of_birth') as string || null,
      date_of_arrival: formData.get('date_of_arrival') as string,
      status: formData.get('status') as 'active' | 'dry' | 'pregnant' | 'sick' | 'sold' | 'dead',
      estimated_milk_capacity: parseFloat(formData.get('estimated_milk_capacity') as string) || null,
      notes: formData.get('notes') as string,
      image_url: selectedCow?.image_url || null
    };

    if (selectedCow) {
      updateCowMutation.mutate({ id: selectedCow.id, ...cowData });
    } else {
      addCowMutation.mutate(cowData);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pregnant': return 'bg-blue-100 text-blue-800';
      case 'dry': return 'bg-yellow-100 text-yellow-800';
      case 'sick': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading cows...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Cows Management</h2>
          <p className="text-muted-foreground">Manage your dairy cows and their information</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => setSelectedCow(null)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Cow
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedCow ? 'Edit Cow' : 'Add New Cow'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cow_number">Cow Number *</Label>
                  <Input
                    id="cow_number"
                    name="cow_number"
                    defaultValue={selectedCow?.cow_number || ''}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="breed">Breed</Label>
                  <Input
                    id="breed"
                    name="breed"
                    defaultValue={selectedCow?.breed || ''}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    name="date_of_birth"
                    type="date"
                    defaultValue={selectedCow?.date_of_birth || ''}
                  />
                </div>
                
                <div>
                  <Label htmlFor="date_of_arrival">Date of Arrival *</Label>
                  <Input
                    id="date_of_arrival"
                    name="date_of_arrival"
                    type="date"
                    defaultValue={selectedCow?.date_of_arrival || ''}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select name="status" defaultValue={selectedCow?.status || 'active'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="dry">Dry</SelectItem>
                      <SelectItem value="pregnant">Pregnant</SelectItem>
                      <SelectItem value="sick">Sick</SelectItem>
                      <SelectItem value="sold">Sold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="estimated_milk_capacity">Est. Milk Capacity (L)</Label>
                  <Input
                    id="estimated_milk_capacity"
                    name="estimated_milk_capacity"
                    type="number"
                    step="0.1"
                    defaultValue={selectedCow?.estimated_milk_capacity || ''}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="image">Cow Image</Label>
                <div className="mt-2">
                  {selectedCow?.image_url && (
                    <img 
                      src={selectedCow.image_url} 
                      alt="Cow" 
                      className="w-24 h-24 object-cover rounded-lg mb-2"
                    />
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file && selectedCow) {
                        const imageUrl = await handleImageUpload(file, selectedCow.id);
                        setSelectedCow({ ...selectedCow, image_url: imageUrl });
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
                  defaultValue={selectedCow?.notes || ''}
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addCowMutation.isPending || updateCowMutation.isPending}>
                  {selectedCow ? 'Update' : 'Add'} Cow
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cow Inventory</CardTitle>
          <CardDescription>
            {cows?.length || 0} cows registered in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Cow Number</TableHead>
                  <TableHead>Breed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Days in Milk</TableHead>
                  <TableHead>Current Yield</TableHead>
                  <TableHead>Lifetime Yield</TableHead>
                  <TableHead>Calves</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cows?.map((cow) => (
                  <TableRow key={cow.id}>
                    <TableCell>
                      {cow.image_url ? (
                        <img 
                          src={cow.image_url} 
                          alt={`Cow ${cow.cow_number}`}
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                          <Image className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{cow.cow_number}</TableCell>
                    <TableCell>{cow.breed || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(cow.status || 'active')}>
                        {cow.status || 'active'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {cow.date_of_birth 
                        ? `${Math.floor((new Date().getTime() - new Date(cow.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365))} years`
                        : 'Unknown'
                      }
                    </TableCell>
                    <TableCell>
                      {cow.last_calving_date 
                        ? `${Math.floor((new Date().getTime() - new Date(cow.last_calving_date).getTime()) / (1000 * 60 * 60 * 24))} days`
                        : 'N/A'
                      }
                    </TableCell>
                    <TableCell>{cow.current_month_yield?.toFixed(1) || '0.0'} L</TableCell>
                    <TableCell>{cow.lifetime_yield?.toFixed(1) || '0.0'} L</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCowForCalves(cow);
                          setCalfDialogOpen(true);
                        }}
                      >
                        <Baby className="h-4 w-4 mr-1" />
                        {calves?.filter(calf => calf.mother_cow_id === cow.id).length || 0}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedCowForDetails(cow);
                            setCowDetailsOpen(true);
                          }}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedCow(cow);
                            setIsDialogOpen(true);
                          }}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this cow?')) {
                              deleteCowMutation.mutate(cow.id);
                            }
                          }}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <CalfDetailsDialog
        calves={calves?.filter(calf => calf.mother_cow_id === selectedCowForCalves?.id) || []}
        isOpen={calfDialogOpen}
        onClose={() => setCalfDialogOpen(false)}
        cowNumber={selectedCowForCalves?.cow_number || ''}
      />

      <CowDetailsModal
        open={cowDetailsOpen}
        onOpenChange={setCowDetailsOpen}
        cow={selectedCowForDetails}
      />
    </div>
  );
};
