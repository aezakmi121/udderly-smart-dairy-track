
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useCowGrouping } from '@/hooks/useCowGrouping';

interface CowRecommendation {
  cow: any;
  recommendedGroup: any;
  currentGroup?: any;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  averageYield: number;
  daysInMilk: number;
}

export const GroupingRecommendations = () => {
  const { cowsForGrouping, cowGroups, groupAssignments, groupingSettings, assignCowToGroupMutation, isLoading } = useCowGrouping();

  const calculateAverageYield = (cow: any) => {
    if (!cow.milk_production || cow.milk_production.length === 0) return 0;
    
    // Calculate average from last 7 days
    const recent = cow.milk_production
      .filter((record: any) => {
        const recordDate = new Date(record.production_date);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return recordDate >= weekAgo;
      })
      .reduce((sum: number, record: any) => sum + record.quantity, 0);
    
    return recent / Math.max(cow.milk_production.length, 1);
  };

  const calculateDaysInMilk = (cow: any) => {
    if (!cow.last_calving_date) return 0;
    const lastCalving = new Date(cow.last_calving_date);
    const today = new Date();
    return Math.floor((today.getTime() - lastCalving.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getRecommendations = (): CowRecommendation[] => {
    if (!cowsForGrouping || !cowGroups || !groupingSettings) return [];

    const yieldThresholds = groupingSettings.find(s => s.setting_name === 'yield_thresholds')?.setting_value as any;
    if (!yieldThresholds) return [];

    const recommendations: CowRecommendation[] = [];

    cowsForGrouping.forEach((cow) => {
      const averageYield = calculateAverageYield(cow);
      const daysInMilk = calculateDaysInMilk(cow);
      
      // Find current group assignment
      const currentAssignment = groupAssignments?.find(a => a.cow_id === cow.id);
      const currentGroup = currentAssignment ? cowGroups.find(g => g.id === currentAssignment.group_id) : null;

      // Find recommended group based on yield
      let recommendedGroup = null;
      let reason = '';
      let priority: 'high' | 'medium' | 'low' = 'low';

      if (averageYield >= yieldThresholds.high) {
        recommendedGroup = cowGroups.find(g => g.group_name === 'High Producers');
        reason = `High yield (${averageYield.toFixed(1)}L/day)`;
        priority = averageYield >= yieldThresholds.high + 5 ? 'high' : 'medium';
      } else if (averageYield >= yieldThresholds.medium) {
        recommendedGroup = cowGroups.find(g => g.group_name === 'Medium Producers');
        reason = `Medium yield (${averageYield.toFixed(1)}L/day)`;
        priority = 'medium';
      } else {
        recommendedGroup = cowGroups.find(g => g.group_name === 'Low Producers');
        reason = `Low yield (${averageYield.toFixed(1)}L/day)`;
        priority = 'low';
      }

      // Only recommend if cow is not already in the recommended group
      if (recommendedGroup && (!currentGroup || currentGroup.id !== recommendedGroup.id)) {
        recommendations.push({
          cow,
          recommendedGroup,
          currentGroup,
          reason,
          priority,
          averageYield,
          daysInMilk
        });
      }
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  };

  const handleAssignRecommendation = async (recommendation: CowRecommendation) => {
    await assignCowToGroupMutation.mutateAsync({
      cowId: recommendation.cow.id,
      groupId: recommendation.recommendedGroup.id
    });
  };

  const recommendations = getRecommendations();

  if (isLoading) {
    return <div className="text-center py-4">Loading recommendations...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Grouping Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Based on recent milk production data, here are cows that might benefit from group reassignment.
          </p>
        </CardContent>
      </Card>

      {recommendations.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No grouping recommendations at this time.</p>
            <p className="text-sm text-muted-foreground mt-2">
              All cows appear to be in appropriate groups based on their current production.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec) => (
            <Card key={rec.cow.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <h3 className="font-semibold">{rec.cow.cow_number}</h3>
                      <p className="text-sm text-muted-foreground">{rec.reason}</p>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      {rec.priority === 'high' && <TrendingUp className="h-4 w-4 text-red-500" />}
                      {rec.priority === 'medium' && <Minus className="h-4 w-4 text-yellow-500" />}
                      {rec.priority === 'low' && <TrendingDown className="h-4 w-4 text-green-500" />}
                      <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}>
                        {rec.priority} priority
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Current:</span>
                        <Badge variant="outline">
                          {rec.currentGroup?.group_name || 'Unassigned'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-muted-foreground">Recommended:</span>
                        <Badge variant="default">
                          {rec.recommendedGroup.group_name}
                        </Badge>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleAssignRecommendation(rec)}
                      disabled={assignCowToGroupMutation.isPending}
                      size="sm"
                    >
                      {assignCowToGroupMutation.isPending ? 'Assigning...' : 'Apply'}
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
                  <span>Avg Yield: {rec.averageYield.toFixed(1)}L/day</span>
                  <span>Days in Milk: {rec.daysInMilk}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
