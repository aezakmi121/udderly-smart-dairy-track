import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Baby, Calendar, Scale, Stethoscope, TrendingUp, Eye } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CalfDetailsDialog } from './CalfDetailsDialog';
import { format } from 'date-fns';

interface CowDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cow: any;
}

export const CowDetailsModal: React.FC<CowDetailsModalProps> = ({
  open,
  onOpenChange,
  cow
}) => {
  const [calfDialogOpen, setCalfDialogOpen] = useState(false);

  // Fetch calves for this cow
  const { data: calves } = useQuery({
    queryKey: ['cow-calves', cow?.id],
    queryFn: async () => {
      if (!cow?.id) return [];
      const { data, error } = await supabase
        .from('calves')
        .select('*')
        .eq('mother_cow_id', cow.id)
        .order('date_of_birth', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!cow?.id
  });

  // Fetch last weight log
  const { data: lastWeight } = useQuery({
    queryKey: ['cow-last-weight', cow?.id],
    queryFn: async () => {
      if (!cow?.id) return null;
      const { data, error } = await supabase
        .from('weight_logs')
        .select('*')
        .eq('cow_id', cow.id)
        .order('log_date', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!cow?.id
  });

  // Fetch last AI record
  const { data: lastAI } = useQuery({
    queryKey: ['cow-last-ai', cow?.id],
    queryFn: async () => {
      if (!cow?.id) return null;
      const { data, error } = await supabase
        .from('ai_records')
        .select('*')
        .eq('cow_id', cow.id)
        .order('ai_date', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!cow?.id
  });

  // Fetch milk production for average yield calculation
  const { data: milkProduction } = useQuery({
    queryKey: ['cow-milk-production', cow?.id],
    queryFn: async () => {
      if (!cow?.id) return [];
      const { data, error } = await supabase
        .from('milk_production')
        .select('quantity, production_date')
        .eq('cow_id', cow.id)
        .gte('production_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('production_date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!cow?.id
  });

  if (!cow) return null;

  const calculateAge = (dateOfBirth: string) => {
    const birth = new Date(dateOfBirth);
    const today = new Date();
    const ageInDays = Math.floor((today.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
    const years = Math.floor(ageInDays / 365);
    const months = Math.floor((ageInDays % 365) / 30);
    
    if (years > 0) {
      return `${years}y ${months}m`;
    }
    return `${months}m`;
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

  const getAIStatusBadge = (ai: any) => {
    if (!ai) return <Badge variant="outline">No AI Records</Badge>;
    
    if (ai.actual_delivery_date) {
      return <Badge variant="default">Delivered</Badge>;
    }
    if (ai.pd_result === 'positive') {
      return <Badge variant="secondary">Pregnant</Badge>;
    }
    if (ai.pd_result === 'negative') {
      return <Badge variant="outline">Not Pregnant</Badge>;
    }
    if (ai.pd_done) {
      return <Badge variant="outline">{ai.pd_result}</Badge>;
    }
    return <Badge variant="destructive">PD Pending</Badge>;
  };

  const averageYield = milkProduction?.length > 0 
    ? (milkProduction.reduce((sum, record) => sum + (record.quantity || 0), 0) / milkProduction.length).toFixed(1)
    : '0.0';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Cow Details - {cow.cow_number}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {cow.image_url && (
                  <div className="flex justify-center mb-4">
                    <img 
                      src={cow.image_url} 
                      alt={`Cow ${cow.cow_number}`}
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="font-medium">Cow Number:</span>
                  <span>{cow.cow_number}</span>
                  
                  <span className="font-medium">Breed:</span>
                  <span>{cow.breed || 'N/A'}</span>
                  
                  <span className="font-medium">Status:</span>
                  <Badge className={getStatusColor(cow.status || 'active')}>
                    {cow.status || 'active'}
                  </Badge>
                  
                  <span className="font-medium">Age:</span>
                  <span>
                    {cow.date_of_birth ? calculateAge(cow.date_of_birth) : 'Unknown'}
                  </span>
                  
                  <span className="font-medium">Date of Birth:</span>
                  <span>
                    {cow.date_of_birth ? format(new Date(cow.date_of_birth), 'MMM dd, yyyy') : 'Unknown'}
                  </span>
                  
                  <span className="font-medium">Date of Arrival:</span>
                  <span>{format(new Date(cow.date_of_arrival), 'MMM dd, yyyy')}</span>
                </div>
              </CardContent>
            </Card>

            {/* Milk Production */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Milk Production
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="font-medium">Current Month:</span>
                  <span className="font-semibold text-blue-600">
                    {cow.current_month_yield?.toFixed(1) || '0.0'} L
                  </span>
                  
                  <span className="font-medium">Lifetime Yield:</span>
                  <span className="font-semibold text-green-600">
                    {cow.lifetime_yield?.toFixed(1) || '0.0'} L
                  </span>
                  
                  <span className="font-medium">Average (30 days):</span>
                  <span className="font-semibold text-orange-600">
                    {averageYield} L/day
                  </span>
                  
                  <span className="font-medium">Peak Yield:</span>
                  <span className="font-semibold text-purple-600">
                    {cow.peak_yield?.toFixed(1) || '0.0'} L
                  </span>
                  
                  <span className="font-medium">Est. Capacity:</span>
                  <span>{cow.estimated_milk_capacity?.toFixed(1) || 'N/A'} L</span>
                  
                  <span className="font-medium">Lactation Number:</span>
                  <span>{cow.lactation_number || 1}</span>
                </div>
              </CardContent>
            </Card>

            {/* Calves Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Baby className="h-4 w-4" />
                  Calves ({calves?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {calves && calves.length > 0 ? (
                  <div className="space-y-2">
                    {calves.slice(0, 3).map((calf) => (
                      <div key={calf.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                          <span className="font-medium">{calf.calf_number || 'Unnamed'}</span>
                          <span className="text-sm text-gray-500 ml-2">({calf.gender})</span>
                        </div>
                        <Badge variant="outline">
                          {format(new Date(calf.date_of_birth), 'MMM yyyy')}
                        </Badge>
                      </div>
                    ))}
                    {calves.length > 3 && (
                      <div className="text-center">
                        <span className="text-sm text-gray-500">+{calves.length - 3} more</span>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCalfDialogOpen(true)}
                      className="w-full mt-2"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View All Calves
                    </Button>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No calves recorded</p>
                )}
              </CardContent>
            </Card>

            {/* Health & Breeding */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Health & Breeding
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div>
                    <span className="font-medium text-sm">Last Weight:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Scale className="h-4 w-4 text-gray-400" />
                      {lastWeight ? (
                        <span>{lastWeight.calculated_weight} kg</span>
                      ) : (
                        <span className="text-gray-500">No weight recorded</span>
                      )}
                      {lastWeight && (
                        <span className="text-xs text-gray-500">
                          ({format(new Date(lastWeight.log_date), 'MMM dd, yyyy')})
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <span className="font-medium text-sm">AI Status:</span>
                    <div className="flex items-center gap-2 mt-1">
                      {getAIStatusBadge(lastAI)}
                      {lastAI && (
                        <span className="text-xs text-gray-500">
                          ({format(new Date(lastAI.ai_date), 'MMM dd, yyyy')})
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {cow.last_calving_date && (
                    <>
                      <Separator />
                      <div>
                        <span className="font-medium text-sm">Last Calving:</span>
                        <div className="text-sm mt-1">
                          {format(new Date(cow.last_calving_date), 'MMM dd, yyyy')}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                
                {cow.notes && (
                  <>
                    <Separator />
                    <div>
                      <span className="font-medium text-sm">Notes:</span>
                      <p className="text-sm mt-1 text-gray-600">{cow.notes}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      <CalfDetailsDialog
        calves={calves || []}
        isOpen={calfDialogOpen}
        onClose={() => setCalfDialogOpen(false)}
        cowNumber={cow.cow_number}
      />
    </>
  );
};