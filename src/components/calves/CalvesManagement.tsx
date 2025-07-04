
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
import { Plus, Edit, Image, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Calf {
  id: string;
  calf_number?: string;
  gender: string;
  date_of_birth: string;
  mother_cow_id?: string;
  breed?: string;
  birth_weight?: number;
  status?: string;
  image_url?: string;
  notes?: string;
}

interface Cow {
  id: string;
  cow_number: string;
}

export const CalvesManagement = () => {
  const [selectedCalf, setSelectedCalf] = useState<Calf | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: calves, isLoading } = useQuery({
    queryKey: ['calves'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calves')
        .select(`
          *,
          cows!mother_cow_id (
            cow_number
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: cows } = useQuery({
    queryKey: ['cows-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cows')
        .select('id, cow_number')
        .eq('status', 'active')
        .order('cow_number');
      
      if (error) throw error;
      return data as Cow[];
    }
  });

  const addCalfMutation = useMutation({
    mutationFn: async (newCalf: Omit<Calf, 'id'>) => {
      const { data, error } = await supabase
        .from('calves')
        .insert([newCalf])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calves'] });
      setIsDialogOpen(false);
      setSelectedCalf(null);
      toast({ title: "Calf added successfully!" });
    }
  });

  const updateCalfMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Calf> & { id: string }) => {
      const { data, error } = await supabase
        .from('calves')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calves'] });
      setIsDialogOpen(false);
      setSelectedCalf(null);
      toast({ title: "Calf updated successfully!" });
    }
  });

  const deleteCalfMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('calves')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calves'] });
      toast({ title: "Calf deleted successfully!" });
    }
  });

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

      if (calfId) {
        await updateCalfMutation.mutateAsync({ id: calfId, image_url: publicUrl });
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
    
    const calfData = {
      calf_number: formData.get('calf_number') as string,
      gender: formData.get('gender') as string,
      date_of_birth: formData.get('date_of_birth') as string,
      mother_cow_id: formData.get('mother_cow_id') as string || null,
      breed: formData.get('breed') as string,
      birth_weight: parseFloat(formData.get('birth_weight') as string) || null,
      status: formData.get('status') as string,
      notes: formData.get('notes') as string,
      image_url: selectedCalf?.image_url || null
    };

    if (selectedCalf) {
      updateCalfMutation.mutate({ id: selectedCalf.id, ...calfData });
    } else {
      addCalfMutation.mutate(calfData);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'alive': return 'bg-green-100 text-green-800';
      case 'sold': return 'bg-blue-100 text-blue-800';
      case 'dead': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateAge = (birthDate: string) => {
    const birth = new Date(birthDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - birth.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      return `${diffDays} days`;
    } else if (diffDays < 365) {
      return `${Math.floor(diffDays / 30)} months`;
    } else {
      return `${Math.floor(diffDays / 365)} years`;
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading calves...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Calves Management</h2>
          <p className="text-muted-foreground">Track and manage your calves</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => setSelectedCalf(null)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Calf
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedCalf ? 'Edit Calf' : 'Add New Calf'}
              </DialogTitle>
            </DialogHeader>
            
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
                  <Select name="gender" defaultValue={selectedCalf?.gender || ''} required>
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
                  <Label htmlFor="mother_cow_id">Mother Cow</Label>
                  <Select name="mother_cow_id" defaultValue={selectedCalf?.mother_cow_id || ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select mother cow" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No mother selected</SelectItem>
                      {cows?.map((cow) => (
                        <SelectItem key={cow.id} value={cow.id}>
                          {cow.cow_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addCalfMutation.isPending || updateCalfMutation.isPending}>
                  {selectedCalf ? 'Update' : 'Add'} Calf
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Calves Inventory</CardTitle>
          <CardDescription>
            {calves?.length || 0} calves registered in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Calf Number</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Mother</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calves?.map((calf: any) => (
                  <TableRow key={calf.id}>
                    <TableCell>
                      {calf.image_url ? (
                        <img 
                          src={calf.image_url} 
                          alt={`Calf ${calf.calf_number}`}
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                          <Image className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{calf.calf_number || 'N/A'}</TableCell>
                    <TableCell className="capitalize">{calf.gender}</TableCell>
                    <TableCell>{calculateAge(calf.date_of_birth)}</TableCell>
                    <TableCell>{calf.cows?.cow_number || 'Unknown'}</TableCell>
                    <TableCell>{calf.birth_weight ? `${calf.birth_weight} kg` : 'N/A'}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(calf.status || 'alive')}>
                        {calf.status || 'alive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedCalf(calf);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this calf?')) {
                              deleteCalfMutation.mutate(calf.id);
                            }
                          }}
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
    </div>
  );
};
