import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Phone, MapPin, Upload, Eye, ArrowUpDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BulkFarmerUpload } from './BulkFarmerUpload';
import { FarmerAnalyticsModal } from './FarmerAnalyticsModal';

interface Farmer {
  id: string;
  farmer_code: string;
  name: string;
  phone_number: string;
  address?: string;
  is_active?: boolean;
  created_at?: string;
}

export const FarmersManagement = () => {
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [analyticsModalFarmer, setAnalyticsModalFarmer] = useState<Farmer | null>(null);
  const [sortBy, setSortBy] = useState<keyof Farmer>('farmer_code');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: farmersData, isLoading } = useQuery({
    queryKey: ['farmers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('farmers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Farmer[];
    }
  });

  const farmers = useMemo(() => {
    if (!farmersData) return [];
    
    const sorted = [...farmersData].sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      // Handle null/undefined values
      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';
      
      // Special handling for farmer_code to sort numerically
      if (sortBy === 'farmer_code') {
        // Extract numeric parts for natural sorting
        const aNum = parseInt(String(aValue).replace(/\D/g, '')) || 0;
        const bNum = parseInt(String(bValue).replace(/\D/g, '')) || 0;
        
        if (sortOrder === 'asc') {
          return aNum - bNum;
        } else {
          return bNum - aNum;
        }
      }
      
      // Convert to string for comparison
      aValue = String(aValue);
      bValue = String(bValue);
      
      if (sortOrder === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
    
    return sorted;
  }, [farmersData, sortBy, sortOrder]);

  const handleSort = (field: keyof Farmer) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const openAnalyticsModal = (farmer: Farmer) => {
    setAnalyticsModalFarmer(farmer);
    setAnalyticsModalOpen(true);
  };

  const addFarmerMutation = useMutation({
    mutationFn: async (newFarmer: Omit<Farmer, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('farmers')
        .insert([newFarmer])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farmers'] });
      setIsDialogOpen(false);
      setSelectedFarmer(null);
      toast({ title: "Farmer added successfully!" });
    }
  });

  const updateFarmerMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Farmer> & { id: string }) => {
      const { data, error } = await supabase
        .from('farmers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farmers'] });
      setIsDialogOpen(false);
      setSelectedFarmer(null);
      toast({ title: "Farmer updated successfully!" });
    }
  });

  const deleteFarmerMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('farmers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farmers'] });
      toast({ title: "Farmer deleted successfully!" });
    }
  });

  const toggleFarmerStatus = async (farmer: Farmer) => {
    try {
      await updateFarmerMutation.mutateAsync({
        id: farmer.id,
        is_active: !farmer.is_active
      });
    } catch (error) {
      toast({ title: "Error updating farmer status", variant: "destructive" });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const farmerData = {
      farmer_code: formData.get('farmer_code') as string,
      name: formData.get('name') as string,
      phone_number: formData.get('phone_number') as string,
      address: formData.get('address') as string,
      is_active: formData.get('is_active') === 'on'
    };

    // Validate phone number
    if (
  farmerData.phone_number &&
  !/^\d{10}$/.test(farmerData.phone_number)
) {
  toast({ 
    title: "Invalid phone number", 
    description: "Phone number must be exactly 10 digits if provided",
    variant: "destructive" 
  });
  return;
}


    // Check for duplicates
    const isDuplicate = farmersData?.some(farmer => 
      farmer.id !== selectedFarmer?.id && (
        farmer.farmer_code === farmerData.farmer_code || 
        farmer.phone_number === farmerData.phone_number
      )
    );

    if (isDuplicate) {
      toast({ 
        title: "Duplicate farmer", 
        description: "Farmer with this code or phone number already exists",
        variant: "destructive" 
      });
      return;
    }

    if (selectedFarmer) {
      updateFarmerMutation.mutate({ id: selectedFarmer.id, ...farmerData });
    } else {
      addFarmerMutation.mutate(farmerData);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading farmers...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Farmers Management</h2>
          <p className="text-muted-foreground">Manage milk suppliers and their information</p>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="outline"
            onClick={() => setBulkUploadOpen(true)}
            className="text-sm"
          >
            <Upload className="h-4 w-4 mr-2" />
            Bulk Upload
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => setSelectedFarmer(null)}
                className="bg-green-600 hover:bg-green-700 text-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Farmer
              </Button>
            </DialogTrigger>
          
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {selectedFarmer ? 'Edit Farmer' : 'Add New Farmer'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="farmer_code">Farmer Code *</Label>
                  <Input
                    id="farmer_code"
                    name="farmer_code"
                    placeholder="F001"
                    defaultValue={selectedFarmer?.farmer_code || ''}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={selectedFarmer?.name || ''}
                    required
                  />
                </div>
              </div>

                <div>
                  <Label htmlFor="phone_number">Phone Number *</Label>
                  <Input
                    id="phone_number"
                    name="phone_number"
                    type="tel"
                    pattern="\d{10}"
                    maxLength={10}
                    placeholder="10-digit phone number"
                    defaultValue={selectedFarmer?.phone_number || ''}
                    
                  />
                  <p className="text-xs text-muted-foreground mt-1">Must be exactly 10 digits</p>
                </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  name="address"
                  defaultValue={selectedFarmer?.address || ''}
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  name="is_active"
                  defaultChecked={selectedFarmer?.is_active !== false}
                />
                <Label htmlFor="is_active">Active Status</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addFarmerMutation.isPending || updateFarmerMutation.isPending}>
                  {selectedFarmer ? 'Update' : 'Add'} Farmer
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <BulkFarmerUpload 
        open={bulkUploadOpen}
        onOpenChange={setBulkUploadOpen}
      />

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Farmers Directory</CardTitle>
              <CardDescription>
                {farmers?.length || 0} farmers registered in the system
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Label htmlFor="sort-select" className="text-sm whitespace-nowrap">Sort by:</Label>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as keyof Farmer)}>
                <SelectTrigger className="w-28 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="farmer_code">Code</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="created_at">Date</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-2"
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {farmers?.map((farmer) => (
                  <TableRow key={farmer.id}>
                    <TableCell className="font-medium">{farmer.farmer_code}</TableCell>
                    <TableCell>{farmer.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-1 text-muted-foreground" />
                        {farmer.phone_number}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center max-w-48 truncate">
                        <MapPin className="h-4 w-4 mr-1 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{farmer.address || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Badge className={farmer.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {farmer.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Switch
                          checked={farmer.is_active}
                          onCheckedChange={() => toggleFarmerStatus(farmer)}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      {farmer.created_at ? new Date(farmer.created_at).toLocaleDateString('en-GB') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAnalyticsModal(farmer)}
                          title="View Analytics"
                          className="px-2 py-1 h-8 w-8"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedFarmer(farmer);
                            setIsDialogOpen(true);
                          }}
                          className="px-2 py-1 h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this farmer?')) {
                              deleteFarmerMutation.mutate(farmer.id);
                            }
                          }}
                          className="px-2 py-1 h-8 w-8"
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

      <FarmerAnalyticsModal
        open={analyticsModalOpen}
        onOpenChange={setAnalyticsModalOpen}
        farmer={analyticsModalFarmer}
      />
    </div>
  );
};
