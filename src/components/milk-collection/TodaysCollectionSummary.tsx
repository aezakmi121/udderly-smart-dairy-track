
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

interface TodaysCollectionSummaryProps {
  collections: any[];
  isLoading: boolean;
}

export const TodaysCollectionSummary: React.FC<TodaysCollectionSummaryProps> = ({ 
  collections, 
  isLoading 
}) => {
  const today = new Date().toISOString().split('T')[0];
  
  const todaysCollections = collections.filter(
    collection => collection.collection_date === today
  );

  const morningCollections = todaysCollections.filter(c => c.session === 'morning');
  const eveningCollections = todaysCollections.filter(c => c.session === 'evening');

  const calculateSessionTotals = (sessionCollections: any[]) => ({
    quantity: sessionCollections.reduce((sum, c) => sum + Number(c.quantity), 0),
    amount: sessionCollections.reduce((sum, c) => sum + Number(c.total_amount), 0),
    count: sessionCollections.length
  });

  const morningTotals = calculateSessionTotals(morningCollections);
  const eveningTotals = calculateSessionTotals(eveningCollections);
  const dayTotals = calculateSessionTotals(todaysCollections);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Today's Collection Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading today's collections...</div>
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
              <div className="text-2xl font-bold">{morningTotals.quantity.toFixed(1)}L</div>
              <div className="text-sm text-green-600 font-semibold">₹{morningTotals.amount.toFixed(2)}</div>
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
              <div className="text-2xl font-bold">{eveningTotals.quantity.toFixed(1)}L</div>
              <div className="text-sm text-green-600 font-semibold">₹{eveningTotals.amount.toFixed(2)}</div>
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
              <div className="text-2xl font-bold">{dayTotals.quantity.toFixed(1)}L</div>
              <div className="text-sm text-green-600 font-semibold">₹{dayTotals.amount.toFixed(2)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today's Collections by Session</CardTitle>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), 'EEEE, MMMM dd, yyyy')}
          </p>
        </CardHeader>
        <CardContent>
          {todaysCollections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No collections recorded for today yet.
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
