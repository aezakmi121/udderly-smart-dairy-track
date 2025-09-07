
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';

interface TodaysCollectionSummaryProps {
  collections: any[];
  dailyStats?: any;
  selectedDate: string;
  isLoading: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  onEdit?: (collection: any) => void;
  onDelete?: (id: string) => void;
}

export const TodaysCollectionSummary: React.FC<TodaysCollectionSummaryProps> = ({ 
  collections, 
  dailyStats,
  selectedDate,
  isLoading,
  canEdit = false,
  canDelete = false,
  onEdit,
  onDelete
}) => {
  const selectedCollections = collections.filter(
    collection => collection.collection_date === selectedDate
  );

  const morningCollections = selectedCollections.filter(c => c.session === 'morning');
  const eveningCollections = selectedCollections.filter(c => c.session === 'evening');

  // Calculate averages safely
  const getMorningAvgRate = () => {
    if (morningCollections.length === 0) return 0;
    return morningCollections.reduce((sum, c) => sum + Number(c.rate_per_liter || 0), 0) / morningCollections.length;
  };
  
  const getEveningAvgRate = () => {
    if (eveningCollections.length === 0) return 0;
    return eveningCollections.reduce((sum, c) => sum + Number(c.rate_per_liter || 0), 0) / eveningCollections.length;
  };
  
  const getDayAvgRate = () => {
    if (selectedCollections.length === 0) return 0;
    return selectedCollections.reduce((sum, c) => sum + Number(c.rate_per_liter || 0), 0) / selectedCollections.length;
  };

  // Use dailyStats if available, otherwise calculate from collections
  const morningTotals = dailyStats?.morning ? {
    ...dailyStats.morning,
    avgRate: dailyStats.morning.avgRate ?? getMorningAvgRate()
  } : {
    quantity: morningCollections.reduce((sum, c) => sum + Number(c.quantity || 0), 0),
    amount: morningCollections.reduce((sum, c) => sum + Number(c.total_amount || 0), 0),
    count: morningCollections.length,
    avgRate: getMorningAvgRate()
  };
  
  const eveningTotals = dailyStats?.evening ? {
    ...dailyStats.evening,
    avgRate: dailyStats.evening.avgRate ?? getEveningAvgRate()
  } : {
    quantity: eveningCollections.reduce((sum, c) => sum + Number(c.quantity || 0), 0),
    amount: eveningCollections.reduce((sum, c) => sum + Number(c.total_amount || 0), 0),
    count: eveningCollections.length,
    avgRate: getEveningAvgRate()
  };
  
  const dayTotals = dailyStats?.total ? {
    ...dailyStats.total,
    avgRate: dailyStats.total.avgRate ?? getDayAvgRate()
  } : {
    quantity: selectedCollections.reduce((sum, c) => sum + Number(c.quantity || 0), 0),
    amount: selectedCollections.reduce((sum, c) => sum + Number(c.total_amount || 0), 0),
    count: selectedCollections.length,
    avgRate: getDayAvgRate()
  };

  const handleEdit = (collection: any) => {
    if (onEdit) {
      onEdit(collection);
    }
  };

  const handleDelete = (id: string) => {
    if (onDelete && confirm('Are you sure you want to delete this collection record?')) {
      onDelete(id);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Collection Summary - {formatDate(selectedDate)}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading collections...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Morning Session
              <Badge variant="secondary">{morningTotals.count}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-2xl font-bold">{(morningTotals?.quantity || 0).toFixed(1)}L</div>
              <div className="text-sm text-green-600 font-semibold">₹{(morningTotals?.amount || 0).toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">Avg Rate: ₹{(morningTotals?.avgRate || 0).toFixed(2)}/L</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Evening Session
              <Badge variant="secondary">{eveningTotals.count}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-2xl font-bold">{(eveningTotals?.quantity || 0).toFixed(1)}L</div>
              <div className="text-sm text-green-600 font-semibold">₹{(eveningTotals?.amount || 0).toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">Avg Rate: ₹{(eveningTotals?.avgRate || 0).toFixed(2)}/L</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Total Today
              <Badge variant="default">{dayTotals.count}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-2xl font-bold">{(dayTotals?.quantity || 0).toFixed(1)}L</div>
              <div className="text-sm text-green-600 font-semibold">₹{(dayTotals?.amount || 0).toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">Avg Rate: ₹{(dayTotals?.avgRate || 0).toFixed(2)}/L</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Collections by Session</CardTitle>
          <p className="text-sm text-muted-foreground">
            {formatDate(selectedDate)}
          </p>
        </CardHeader>
        <CardContent>
          {selectedCollections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No collections recorded for this date yet.
            </div>
          ) : (
            <div className="space-y-6">
              {morningCollections.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Badge variant="outline">Morning Session</Badge>
                    <span className="text-sm text-muted-foreground">
                      {morningCollections.length} collections
                    </span>
                  </h4>
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Farmer</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Fat %</TableHead>
                        <TableHead>SNF %</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Amount</TableHead>
                        {(canEdit || canDelete) && <TableHead>Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {morningCollections.map((collection) => (
                        <TableRow key={collection.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{collection.farmers?.name || 'N/A'}</div>
                              <div className="text-sm text-muted-foreground">
                                {collection.farmers?.farmer_code || 'N/A'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{collection.quantity}L</TableCell>
                          <TableCell>{collection.fat_percentage}%</TableCell>
                          <TableCell>{collection.snf_percentage}%</TableCell>
                          <TableCell>₹{collection.rate_per_liter}</TableCell>
                          <TableCell className="font-semibold">₹{collection.total_amount}</TableCell>
                          {(canEdit || canDelete) && (
                            <TableCell>
                              <div className="flex gap-1">
                                {canEdit && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEdit(collection)}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                )}
                                {canDelete && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDelete(collection.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {eveningCollections.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Badge variant="outline">Evening Session</Badge>
                    <span className="text-sm text-muted-foreground">
                      {eveningCollections.length} collections
                    </span>
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Farmer</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Fat %</TableHead>
                        <TableHead>SNF %</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Amount</TableHead>
                        {(canEdit || canDelete) && <TableHead>Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eveningCollections.map((collection) => (
                        <TableRow key={collection.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{collection.farmers?.name || 'N/A'}</div>
                              <div className="text-sm text-muted-foreground">
                                {collection.farmers?.farmer_code || 'N/A'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{collection.quantity}L</TableCell>
                          <TableCell>{collection.fat_percentage}%</TableCell>
                          <TableCell>{collection.snf_percentage}%</TableCell>
                          <TableCell>₹{collection.rate_per_liter}</TableCell>
                          <TableCell className="font-semibold">₹{collection.total_amount}</TableCell>
                          {(canEdit || canDelete) && (
                            <TableCell>
                              <div className="flex gap-1">
                                {canEdit && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEdit(collection)}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                )}
                                {canDelete && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDelete(collection.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
