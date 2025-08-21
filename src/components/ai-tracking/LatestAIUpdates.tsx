import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Eye, Edit, Trash2 } from 'lucide-react';
import { useAITracking } from '@/hooks/useAITracking';
import { format, parseISO, differenceInDays } from 'date-fns';

interface LatestAIUpdatesProps {
  onUpdateRecord: (id: string, updates: any) => void;
  onDeleteRecord: (id: string) => void;
}

export const LatestAIUpdates: React.FC<LatestAIUpdatesProps> = ({
  onUpdateRecord,
  onDeleteRecord
}) => {
  const { aiRecords, isLoading } = useAITracking();

  const uniqueCowRecords = useMemo(() => {
    if (!aiRecords) return [];
    
    // Group records by cow_id and get the latest AI record for each cow
    const cowMap = new Map();
    
    aiRecords.forEach(record => {
      if (record.cow_id) {
        const existing = cowMap.get(record.cow_id);
        if (!existing || record.ai_date > existing.ai_date) {
          cowMap.set(record.cow_id, record);
        }
      }
    });
    
    const uniqueRecords = Array.from(cowMap.values());
    
    // Sort by priority: cows about to deliver first, then PD due, then others
    return uniqueRecords.sort((a, b) => {
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      
      // Priority 1: Cows about to deliver (within 10 days of expected delivery)
      const aDelivery = a.expected_delivery_date ? differenceInDays(parseISO(a.expected_delivery_date), today) : 999;
      const bDelivery = b.expected_delivery_date ? differenceInDays(parseISO(b.expected_delivery_date), today) : 999;
      
      const aAboutToDeliver = aDelivery >= 0 && aDelivery <= 10;
      const bAboutToDeliver = bDelivery >= 0 && bDelivery <= 10;
      
      if (aAboutToDeliver && !bAboutToDeliver) return -1;
      if (!aAboutToDeliver && bAboutToDeliver) return 1;
      if (aAboutToDeliver && bAboutToDeliver) return aDelivery - bDelivery;
      
      // Priority 2: PD due (45-60 days after AI)
      const aDaysAfterAI = differenceInDays(today, parseISO(a.ai_date));
      const bDaysAfterAI = differenceInDays(today, parseISO(b.ai_date));
      
      const aPDDue = aDaysAfterAI >= 45 && aDaysAfterAI <= 60 && !a.pd_done;
      const bPDDue = bDaysAfterAI >= 45 && bDaysAfterAI <= 60 && !b.pd_done;
      
      if (aPDDue && !bPDDue) return -1;
      if (!aPDDue && bPDDue) return 1;
      
      // Priority 3: Sort by latest AI date
      return b.ai_date.localeCompare(a.ai_date);
    });
  }, [aiRecords]);

  const getPriorityBadge = (record: any) => {
    const today = new Date();
    const daysAfterAI = differenceInDays(today, parseISO(record.ai_date));
    
    if (record.expected_delivery_date) {
      const daysToDelivery = differenceInDays(parseISO(record.expected_delivery_date), today);
      if (daysToDelivery >= 0 && daysToDelivery <= 10) {
        return <Badge variant="destructive">Delivery Due in {daysToDelivery} days</Badge>;
      }
    }
    
    if (daysAfterAI >= 45 && daysAfterAI <= 60 && !record.pd_done) {
      return <Badge variant="secondary">PD Due</Badge>;
    }
    
    return null;
  };

  const getStatusColor = (record: any) => {
    if (record.actual_delivery_date) return 'text-green-600';
    if (record.pd_result === 'positive') return 'text-blue-600';
    if (record.pd_result === 'negative') return 'text-red-600';
    if (record.ai_status === 'failed') return 'text-red-600';
    return 'text-gray-600';
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading latest AI updates...</div>;
  }

  if (uniqueCowRecords.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No AI records found
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {uniqueCowRecords.map((record) => (
          <Card key={record.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg">
                      Cow #{record.cows?.cow_number || 'Unknown'}
                    </h3>
                    {getPriorityBadge(record)}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>AI Date: {format(parseISO(record.ai_date), 'MMM dd, yyyy')}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Service #:</span>
                      <span>{record.service_number}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Status:</span>
                      <span className={getStatusColor(record)}>
                        {record.actual_delivery_date ? 'Delivered' 
                         : record.pd_result === 'positive' ? 'Pregnant'
                         : record.pd_result === 'negative' ? 'Not Pregnant'
                         : record.ai_status === 'failed' ? 'Failed'
                         : 'Pending'}
                      </span>
                    </div>
                    
                    {record.expected_delivery_date && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>Expected: {format(parseISO(record.expected_delivery_date), 'MMM dd, yyyy')}</span>
                      </div>
                    )}
                    
                    {record.pd_date && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">PD Date:</span>
                        <span>{format(parseISO(record.pd_date), 'MMM dd, yyyy')}</span>
                      </div>
                    )}
                    
                    {record.actual_delivery_date && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Delivered:</span>
                        <span>{format(parseISO(record.actual_delivery_date), 'MMM dd, yyyy')}</span>
                      </div>
                    )}
                  </div>
                  
                  {record.notes && (
                    <div className="text-sm text-muted-foreground">
                      <strong>Notes:</strong> {record.notes}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onUpdateRecord(record.id, {})}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDeleteRecord(record.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};