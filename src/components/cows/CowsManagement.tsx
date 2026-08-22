
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
import { Edit, Image, Baby, Eye, ArrowRight, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useCalves } from '@/hooks/useCalves';
import { CalfDetailsDialog } from './CalfDetailsDialog';
import { CowDetailsModal } from './CowDetailsModal';
import { CowFiltersModal } from './CowFiltersModal';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { COW_STATUS_LABEL, isGone, isOnFarm, statusTone } from '@/lib/cowPresence';

interface Cow {
  id: string;
  cow_number: string;
  breed?: string;
  date_of_birth?: string;
  date_of_arrival: string;
  status?: 'active' | 'dry' | 'pregnant' | 'sick' | 'sold' | 'dead';
  exit_date?: string | null;
  exit_reason?: string | null;
  exit_note?: string | null;
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
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { calves } = useCalves();
  const { canEdit } = useUserPermissions();

  const { data: cows, isLoading } = useQuery({
    queryKey: ['cows-list'], // Use same cache key as useCows hook
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cows')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Cow[];
    }
  });

  // Fetch milk production for current month for all cows
  const { data: milkProductionData } = useQuery({
    queryKey: ['milk-production-current-month'],
    queryFn: async () => {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('milk_production')
        .select('cow_id, quantity, production_date')
        .gte('production_date', firstDayOfMonth);
      
      if (error) throw error;
      return data;
    }
  });

  // Calculate daily average for each cow
  const cowDailyAverages = useMemo(() => {
    if (!milkProductionData) return new Map<string, number>();
    
    const averages = new Map<string, number>();
    const cowProduction = new Map<string, number[]>();
    
    milkProductionData.forEach(record => {
      if (!record.cow_id) return;
      if (!cowProduction.has(record.cow_id)) {
        cowProduction.set(record.cow_id, []);
      }
      cowProduction.get(record.cow_id)!.push(record.quantity);
    });
    
    cowProduction.forEach((quantities, cowId) => {
      const avg = quantities.reduce((sum, q) => sum + q, 0) / quantities.length;
      averages.set(cowId, avg);
    });
    
    return averages;
  }, [milkProductionData]);

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
      queryClient.invalidateQueries({ queryKey: ['cows-list'] });
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
      queryClient.invalidateQueries({ queryKey: ['cows-list'] });
      setIsDialogOpen(false);
      setSelectedCow(null);
      toast({ title: "Cow updated successfully!" });
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
    
    const gone = isGone(formData.get('status') as string);
    const cowData = {
      cow_number: formData.get('cow_number') as string,
      breed: formData.get('breed') as string,
      date_of_birth: formData.get('date_of_birth') as string || null,
      date_of_arrival: formData.get('date_of_arrival') as string,
      status: formData.get('status') as Cow['status'],
      // Cleared when she comes back to active, so a corrected mistake does not
      // leave a stale exit date behind.
      exit_date: gone ? (formData.get('exit_date') as string) || null : null,
      exit_reason: gone ? (formData.get('exit_reason') as string) || null : null,
      exit_note: gone ? (formData.get('exit_note') as string) || null : null,
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

  const onFarmCows = useMemo(
    () => filteredAndSortedCows.filter((c) => isOnFarm(c.status)),
    [filteredAndSortedCows]
  );
  const goneCows = useMemo(
    () => filteredAndSortedCows.filter((c) => isGone(c.status)),
    [filteredAndSortedCows]
  );

  const openDetails = (cow: Cow) => { setSelectedCowForDetails(cow); setCowDetailsOpen(true); };
  const openEdit = (cow: Cow) => { setSelectedCow(cow); setIsDialogOpen(true); };
  const openCalves = (cow: Cow) => { setSelectedCowForCalves(cow); setCalfDialogOpen(true); };
  const calfCount = (cow: Cow) => calves?.filter((c) => c.mother_cow_id === cow.id).length || 0;

  const ageLabel = (cow: Cow) =>
    cow.date_of_birth
      ? `${Math.floor((Date.now() - new Date(cow.date_of_birth).getTime()) / 31557600000)} yr`
      : 'age unknown';
  const dimLabel = (cow: Cow) =>
    cow.last_calving_date
      ? `${Math.floor((Date.now() - new Date(cow.last_calving_date).getTime()) / 86400000)} days in milk`
      : null;
  const statusLabel = (cow: Cow) => COW_STATUS_LABEL[cow.status || 'active'] ?? cow.status;

  /** One cow, readable one-handed. No horizontal scroll at any width. */
  const renderCard = (cow: Cow) => (
    <div key={cow.id} className="rounded-xl border bg-card p-3">
      <button type="button" onClick={() => openDetails(cow)} className="flex w-full items-center gap-3 text-left">
        {cow.image_url ? (
          <img src={cow.image_url} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Image className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-xl font-bold tabular-nums">#{cow.cow_number}</span>
            <span className="truncate text-sm text-muted-foreground">{cow.breed || 'Unknown breed'}</span>
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {[ageLabel(cow), dimLabel(cow), `${(cowDailyAverages.get(cow.id) || 0).toFixed(1)} L/day`]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </span>
        <Badge className={`${statusTone(cow.status)} shrink-0`}>{statusLabel(cow)}</Badge>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
      </button>
      <div className="mt-2 flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={() => openCalves(cow)}>
          <Baby className="mr-1 h-4 w-4" /> {calfCount(cow)} calves
        </Button>
        {canEdit.cows && (
          <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(cow)}>
            <Edit className="mr-1 h-4 w-4" /> Edit
          </Button>
        )}
      </div>
    </div>
  );

  /** Nine columns genuinely fit on a laptop, so the table stays there. */
  const renderTable = (rows: Cow[]) => (
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
            <TableHead>Daily Avg (Month)</TableHead>
            <TableHead>Calves</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((cow) => (
            <TableRow key={cow.id}>
              <TableCell>
                {cow.image_url ? (
                  <img src={cow.image_url} alt={`Cow ${cow.cow_number}`} className="h-12 w-12 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                    <Image className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </TableCell>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {cow.cow_number}
                  {cow.is_promoted_calf && (
                    <Badge variant="outline" className="text-xs">
                      <ArrowRight className="mr-1 h-3 w-3" /> Promoted
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>{cow.breed || 'N/A'}</TableCell>
              <TableCell><Badge className={statusTone(cow.status)}>{statusLabel(cow)}</Badge></TableCell>
              <TableCell>{ageLabel(cow)}</TableCell>
              <TableCell>{dimLabel(cow) ?? 'N/A'}</TableCell>
              <TableCell>{(cowDailyAverages.get(cow.id) || 0).toFixed(1)} L/day</TableCell>
              <TableCell>
                <Button variant="outline" size="sm" onClick={() => openCalves(cow)}>
                  <Baby className="mr-1 h-4 w-4" />{calfCount(cow)}
                </Button>
              </TableCell>
              <TableCell>
                {/* The delete button that used to sit here ran a hard DELETE,
                    and every FK pointing at cows was ON DELETE CASCADE -- so a
                    misclick took her breeding history, her calves and every
                    litre ever recorded against her. A cow leaving the herd is
                    marked sold or dead in Edit; she is not a row to remove. */}
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => openDetails(cow)} title="View Details">
                    <Eye className="h-4 w-4" />
                  </Button>
                  {canEdit.cows && (
                    <Button variant="outline" size="sm" onClick={() => openEdit(cow)} title="Edit">
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* No page heading: the nav says where you are, and the list below is
          what you came for. This row was flex-col on mobile, which stretched
          both buttons to the full container width -- that is why Filters
          looked wrong, not anything about the button itself. */}
      <div className="flex flex-row items-center justify-end gap-2">
        <CowFiltersModal
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
          open={filterModalOpen}
          onOpenChange={setFilterModalOpen}
        />

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

      {/* Two groups, one axis: is she still here. Condition is not a section --
          a cow on this farm is active whatever her condition -- and a search
          cuts across both, because asking after a cow should not require
          knowing first whether she has been sold. */}
      {searchTerm.trim() ? (
        <CowGroup label={`Matching "${searchTerm.trim()}"`} cows={filteredAndSortedCows} defaultOpen
          renderCard={renderCard} renderTable={renderTable} />
      ) : (
        <>
          <CowGroup label="On the farm" cows={onFarmCows} defaultOpen
            renderCard={renderCard} renderTable={renderTable} />
          {goneCows.length > 0 && (
            <CowGroup label="Left the herd" cows={goneCows} muted
              renderCard={renderCard} renderTable={renderTable} />
          )}
        </>
      )}

      <p className="px-1 text-[11px] text-muted-foreground">
        {filteredAndSortedCows.length} of {cows?.length || 0} shown
      </p>

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

/**
 * A collapsible group of cows: cards on a phone, the table on a laptop.
 *
 * "On the farm" opens by default and "Left the herd" does not -- unlike the
 * breeding board, which starts fully collapsed. That board is a worklist you
 * scan; this is a register you look things up in, so the group holding almost
 * every cow should already be open.
 */
const CowGroup: React.FC<{
  label: string;
  cows: Cow[];
  defaultOpen?: boolean;
  muted?: boolean;
  renderCard: (cow: Cow) => React.ReactNode;
  renderTable: (cows: Cow[]) => React.ReactNode;
}> = ({ label, cows, defaultOpen = false, muted, renderCard, renderTable }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={`rounded-lg border ${muted ? 'border-dashed' : ''}`}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 p-3 text-left hover:bg-muted/50">
        <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
        <span className={`flex-1 font-semibold ${muted ? 'text-sm font-medium text-muted-foreground' : ''}`}>
          {label}
        </span>
        <Badge variant="secondary">{cows.length}</Badge>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t p-3">
        {cows.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No cows here.</p>
        ) : (
          <>
            <div className="grid gap-2 sm:hidden">{cows.map(renderCard)}</div>
            <div className="hidden sm:block">{renderTable(cows)}</div>
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};
