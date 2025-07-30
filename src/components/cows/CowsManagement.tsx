
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CowModal } from './CowModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Image, Trash2, Baby, Eye, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCalves } from '@/hooks/useCalves';
import { CalfDetailsDialog } from './CalfDetailsDialog';
import { CowDetailsModal } from './CowDetailsModal';
import { CowFilters } from './CowFilters';
import { useUserPermissions } from '@/hooks/useUserPermissions';

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
  promoted_from_calf_id?: string;
  original_mother_cow_id?: string;
  is_promoted_calf?: boolean;
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
  
  // Filter and sort states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [breedFilter, setBreedFilter] = useState('all');
  const [sortBy, setSortBy] = useState('cow_number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { calves } = useCalves();
  const { canEdit } = useUserPermissions();

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

  // Get unique breeds for filter
  const uniqueBreeds = useMemo(() => {
    if (!cows) return [];
    const breeds = new Set(cows.map(cow => cow.breed).filter(Boolean));
    return Array.from(breeds).sort();
  }, [cows]);

  // Filter and sort cows
  const filteredAndSortedCows = useMemo(() => {
    if (!cows) return [];
    
    let filtered = cows.filter(cow => {
      const matchesSearch = cow.cow_number?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
      const matchesStatus = statusFilter === 'all' || cow.status === statusFilter;
      const matchesBreed = breedFilter === 'all' || cow.breed === breedFilter;
      
      return matchesSearch && matchesStatus && matchesBreed;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'cow_number':
          aValue = a.cow_number || '';
          bValue = b.cow_number || '';
          break;
        case 'breed':
          aValue = a.breed || '';
          bValue = b.breed || '';
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        case 'date_of_arrival':
          aValue = a.date_of_arrival || '';
          bValue = b.date_of_arrival || '';
          break;
        case 'lifetime_yield':
          aValue = Number(a.lifetime_yield) || 0;
          bValue = Number(b.lifetime_yield) || 0;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        // Special handling for cow_number which might be numeric
        if (sortBy === 'cow_number') {
          const numA = parseFloat(aValue);
          const numB = parseFloat(bValue);
          
          // If both can be parsed as numbers, sort numerically
          if (!isNaN(numA) && !isNaN(numB)) {
            return sortOrder === 'asc' ? numA - numB : numB - numA;
          }
        }
        
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortOrder === 'asc' 
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }
    });

    return filtered;
  }, [cows, searchTerm, statusFilter, breedFilter, sortBy, sortOrder]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setBreedFilter('all');
    setSortBy('cow_number');
    setSortOrder('asc');
  };


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
        
        {canEdit.cows && (
          <CowModal
            selectedCow={selectedCow}
            onSubmit={handleSubmit}
            isLoading={addCowMutation.isPending || updateCowMutation.isPending}
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            isUploading={isUploading}
            handleImageUpload={handleImageUpload}
            setSelectedCow={setSelectedCow}
          />
        )}
      </div>

      <CowFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        breedFilter={breedFilter}
        setBreedFilter={setBreedFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        onClearFilters={handleClearFilters}
        breeds={uniqueBreeds}
      />

      <Card>
        <CardHeader>
          <CardTitle>Cow Details</CardTitle>
          <CardDescription>
            {filteredAndSortedCows.length} of {cows?.length || 0} cows shown
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
                {filteredAndSortedCows?.map((cow) => (
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
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {cow.cow_number}
                        {cow.is_promoted_calf && (
                          <Badge variant="outline" className="text-xs">
                            <ArrowRight className="h-3 w-3 mr-1" />
                            Promoted
                          </Badge>
                        )}
                      </div>
                    </TableCell>
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
