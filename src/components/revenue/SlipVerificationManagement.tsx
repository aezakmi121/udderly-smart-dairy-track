import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useSlipVerification } from '@/hooks/useSlipVerification';

export const SlipVerificationManagement = () => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [slipQuantity, setSlipQuantity] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  const {
    verifications,
    isLoading,
    updateVerificationMutation,
    generateVerificationsMutation
  } = useSlipVerification(selectedDate);

  const handleUpdate = (id: string, status: string) => {
    updateVerificationMutation.mutate({
      id,
      slip_quantity: Number(slipQuantity),
      admin_notes: adminNotes,
      status: status as any
    }, {
      onSuccess: () => {
        setEditingId(null);
        setSlipQuantity('');
        setAdminNotes('');
      }
    });
  };

  const handleGenerate = (session: 'morning' | 'evening') => {
    generateVerificationsMutation.mutate({
      date: selectedDate,
      session
    });
  };

  const discrepancies = verifications?.filter(v => Math.abs(v.difference) > 0.5) || [];

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Slip Verification</h1>
          <p className="text-muted-foreground">Verify farmer slips against recorded collections</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
      </div>

      {discrepancies.length > 0 && (
        <Card className="p-4 border-destructive bg-destructive/5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h3 className="font-semibold text-destructive">Discrepancies Found</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {discrepancies.length} farmer(s) have differences greater than 0.5L
          </p>
        </Card>
      )}

      <div className="flex gap-2">
        <Button onClick={() => handleGenerate('morning')} variant="outline">
          Generate Morning Verifications
        </Button>
        <Button onClick={() => handleGenerate('evening')} variant="outline">
          Generate Evening Verifications
        </Button>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : verifications && verifications.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Farmer</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Session</TableHead>
              <TableHead>Recorded (L)</TableHead>
              <TableHead>Slip (L)</TableHead>
              <TableHead>Difference</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Admin Notes</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {verifications.map((verification) => (
              <TableRow key={verification.id}>
                <TableCell>{verification.farmers?.name}</TableCell>
                <TableCell>{verification.farmers?.farmer_code}</TableCell>
                <TableCell>
                  <Badge variant={verification.session === 'morning' ? 'default' : 'secondary'}>
                    {verification.session}
                  </Badge>
                </TableCell>
                <TableCell>{Number(verification.recorded_quantity).toFixed(2)}</TableCell>
                <TableCell>
                  {editingId === verification.id ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={slipQuantity}
                      onChange={(e) => setSlipQuantity(e.target.value)}
                      className="w-24"
                    />
                  ) : (
                    Number(verification.slip_quantity).toFixed(2)
                  )}
                </TableCell>
                <TableCell>
                  <span className={Math.abs(verification.difference) > 0.5 ? 'text-destructive font-bold' : ''}>
                    {Number(verification.difference).toFixed(2)}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={
                    verification.status === 'verified' ? 'default' :
                    verification.status === 'discrepancy' ? 'destructive' :
                    'secondary'
                  }>
                    {verification.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {editingId === verification.id ? (
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="w-48"
                      rows={2}
                    />
                  ) : (
                    <span className="text-sm">{verification.admin_notes || '-'}</span>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === verification.id ? (
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        onClick={() => handleUpdate(verification.id, 'verified')}
                        disabled={updateVerificationMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleUpdate(verification.id, 'discrepancy')}
                        disabled={updateVerificationMutation.isPending}
                      >
                        Flag
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setEditingId(null);
                          setSlipQuantity('');
                          setAdminNotes('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setEditingId(verification.id);
                        setSlipQuantity(verification.slip_quantity.toString());
                        setAdminNotes(verification.admin_notes || '');
                      }}
                    >
                      Edit
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Card className="p-12 text-center">
          <p className="text-lg mb-4">No verifications for this date</p>
          <p className="text-sm text-muted-foreground">Generate verifications to start</p>
        </Card>
      )}
    </div>
  );
};
