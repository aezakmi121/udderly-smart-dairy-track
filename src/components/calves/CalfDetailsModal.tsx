import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Baby, Calendar, Scale, Heart, ArrowRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface CalfDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calf: any;
}

export const CalfDetailsModal: React.FC<CalfDetailsModalProps> = ({
  open,
  onOpenChange,
  calf
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Promote calf to cow mutation
  const promoteToCowMutation = useMutation({
    mutationFn: async (calfData: any) => {
      // Create a new cow record with calf history tracking
      const cowData = {
        cow_number: calfData.calf_number || `COW-${Date.now()}`,
        breed: calfData.breed || 'Unknown',
        date_of_birth: calfData.date_of_birth,
        date_of_arrival: calfData.date_of_birth,
        status: 'active' as const,
        image_url: calfData.image_url,
        promoted_from_calf_id: calfData.id,
        original_mother_cow_id: calfData.mother_cow_id,
        is_promoted_calf: true,
        notes: calfData.notes ? `Promoted from calf. Original notes: ${calfData.notes}` : 'Promoted from calf'
      };

      const { data: newCow, error: cowError } = await supabase
        .from('cows')
        .insert(cowData)
        .select()
        .single();

      if (cowError) throw cowError;

      // Update calf status to indicate it's been promoted
      const { error: calfError } = await supabase
        .from('calves')
        .update({ status: 'sold' as const, notes: `${calfData.notes || ''}\nPromoted to cow on ${format(new Date(), 'MMM dd, yyyy')}` })
        .eq('id', calfData.id);

      if (calfError) throw calfError;

      return newCow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cows'] });
      queryClient.invalidateQueries({ queryKey: ['calves'] });
      toast({ 
        title: "Calf promoted successfully!", 
        description: "The calf has been promoted to a cow and moved to the cows section." 
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to promote calf", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });
  // Fetch mother cow details
  const { data: motherCow } = useQuery({
    queryKey: ['mother-cow', calf?.mother_cow_id],
    queryFn: async () => {
      if (!calf?.mother_cow_id) return null;
      const { data, error } = await supabase
        .from('cows')
        .select('cow_number, breed')
        .eq('id', calf.mother_cow_id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!calf?.mother_cow_id
  });

  // Fetch weight logs for this calf
  const { data: weightLogs } = useQuery({
    queryKey: ['calf-weights', calf?.id],
    queryFn: async () => {
      if (!calf?.id) return [];
      const { data, error } = await supabase
        .from('weight_logs')
        .select('*')
        .eq('cow_id', calf.id)
        .order('log_date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!calf?.id
  });

  // Fetch vaccination records for this calf
  const { data: vaccinations } = useQuery({
    queryKey: ['calf-vaccinations', calf?.id],
    queryFn: async () => {
      if (!calf?.id) return [];
      const { data, error } = await supabase
        .from('vaccination_records')
        .select(`
          *,
          vaccination_schedules!vaccination_records_vaccination_schedule_id_fkey (vaccine_name)
        `)
        .eq('cow_id', calf.id)
        .order('vaccination_date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!calf?.id
  });

  if (!calf) return null;

  const calculateAge = (dateOfBirth: string) => {
    const birth = new Date(dateOfBirth);
    const today = new Date();
    const ageInDays = Math.floor((today.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
    const years = Math.floor(ageInDays / 365);
    const months = Math.floor((ageInDays % 365) / 30);
    const days = ageInDays % 30;
    
    if (years > 0) {
      return `${years}y ${months}m ${days}d`;
    } else if (months > 0) {
      return `${months}m ${days}d`;
    }
    return `${days} days`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'alive': return 'bg-green-100 text-green-800';
      case 'sold': return 'bg-blue-100 text-blue-800';
      case 'dead': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCurrentWeight = () => {
    if (weightLogs && weightLogs.length > 0) {
      return weightLogs[0].calculated_weight;
    }
    return calf.birth_weight || null;
  };

  const weightGain = () => {
    const currentWeight = getCurrentWeight();
    if (currentWeight && calf.birth_weight) {
      return (currentWeight - calf.birth_weight).toFixed(1);
    }
    return null;
  };

  // Check if calf is eligible for promotion (female, alive, over 15 months old)
  const isEligibleForPromotion = () => {
    if (!calf || calf.gender !== 'female' || calf.status !== 'alive') return false;
    
    const birthDate = new Date(calf.date_of_birth);
    const today = new Date();
    const ageInMonths = (today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    return ageInMonths >= 15; // 15 months minimum for breeding age
  };

  const handlePromoteToCow = () => {
    if (confirm('Are you sure you want to promote this calf to a cow? This action cannot be undone.')) {
      promoteToCowMutation.mutate(calf);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <Baby className="h-5 w-5" />
              Calf Details - {calf.calf_number || 'Unnamed'}
            </div>
            {isEligibleForPromotion() && (
              <Button
                onClick={handlePromoteToCow}
                disabled={promoteToCowMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
                size="sm"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                {promoteToCowMutation.isPending ? 'Promoting...' : 'Promote to Cow'}
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {calf.image_url && (
                <div className="flex justify-center mb-4">
                  <img 
                    src={calf.image_url} 
                    alt={`Calf ${calf.calf_number}`}
                    className="w-32 h-32 object-cover rounded-lg"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="font-medium">Calf Number:</span>
                <span>{calf.calf_number || 'Unnamed'}</span>
                
                <span className="font-medium">Gender:</span>
                <Badge variant="outline" className="w-fit">
                  {calf.gender}
                </Badge>
                
                <span className="font-medium">Status:</span>
                <Badge className={getStatusColor(calf.status || 'alive')}>
                  {calf.status || 'alive'}
                </Badge>
                
                <span className="font-medium">Age:</span>
                <span>{calculateAge(calf.date_of_birth)}</span>
                
                <span className="font-medium">Date of Birth:</span>
                <span>{format(new Date(calf.date_of_birth), 'MMM dd, yyyy')}</span>
                
                <span className="font-medium">Breed:</span>
                <span>{calf.breed || motherCow?.breed || 'N/A'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Mother Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Mother Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="font-medium">Mother Cow:</span>
                <span>{motherCow?.cow_number || 'Unknown'}</span>
                
                 <span className="font-medium">Mother Breed:</span>
                 <span>{motherCow?.breed || 'N/A'}</span>
               </div>
            </CardContent>
          </Card>

          {/* Weight Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Scale className="h-4 w-4" />
                Weight Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="font-medium">Birth Weight:</span>
                <span className="font-semibold text-blue-600">
                  {calf.birth_weight ? `${calf.birth_weight} kg` : 'N/A'}
                </span>
                
                <span className="font-medium">Current Weight:</span>
                <span className="font-semibold text-green-600">
                  {getCurrentWeight() ? `${getCurrentWeight()} kg` : 'N/A'}
                </span>
                
                {weightGain() && (
                  <>
                    <span className="font-medium">Weight Gain:</span>
                    <span className="font-semibold text-orange-600">
                      +{weightGain()} kg
                    </span>
                  </>
                )}
                
                <span className="font-medium">Weight Records:</span>
                <span>{weightLogs?.length || 0} records</span>
              </div>
              
              {weightLogs && weightLogs.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-sm mb-2">Recent Weight Records:</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {weightLogs.slice(0, 5).map((log) => (
                      <div key={log.id} className="flex justify-between text-xs bg-gray-50 p-2 rounded">
                        <span>{format(new Date(log.log_date), 'MMM dd, yyyy')}</span>
                        <span className="font-medium">{log.calculated_weight} kg</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Health Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Health Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="font-medium text-sm">Vaccinations:</span>
                <div className="mt-2">
                  {vaccinations && vaccinations.length > 0 ? (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {vaccinations.map((vaccination) => (
                        <div key={vaccination.id} className="flex justify-between text-xs bg-gray-50 p-2 rounded">
                          <span>{vaccination.vaccination_schedules?.vaccine_name || 'Unknown Vaccine'}</span>
                          <span>{format(new Date(vaccination.vaccination_date), 'MMM dd, yyyy')}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-xs">No vaccination records</p>
                  )}
                </div>
              </div>
              
              {calf.notes && (
                <>
                  <Separator />
                  <div>
                    <span className="font-medium text-sm">Notes:</span>
                    <p className="text-sm mt-1 text-gray-600">{calf.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};