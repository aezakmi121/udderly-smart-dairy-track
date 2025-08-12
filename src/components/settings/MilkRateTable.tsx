
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/dateUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMilkRateSettings } from '@/hooks/useMilkRateSettings';

interface MilkRateTableProps {
  rateSettings: any[];
  isLoading: boolean;
}

export const MilkRateTable: React.FC<MilkRateTableProps> = ({ rateSettings, isLoading }) => {
  const { updateRateSettingMutation, deleteRateSettingMutation } = useMilkRateSettings();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ rate_per_liter: string; effective_from: string }>({ rate_per_liter: '', effective_from: '' });

  if (isLoading) {
    return <div className="text-center py-4">Loading rate settings...</div>;
  }

  if (!rateSettings || rateSettings.length === 0) {
    return <div className="text-center py-4">No rate settings found.</div>;
  }

  const startEdit = (setting: any) => {
    setEditingId(setting.id);
    setForm({ rate_per_liter: String(setting.rate_per_liter), effective_from: setting.effective_from?.slice(0,10) });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ rate_per_liter: '', effective_from: '' });
  };

  const saveEdit = (id: string) => {
    updateRateSettingMutation.mutate({ id, rate_per_liter: Number(form.rate_per_liter), effective_from: form.effective_from });
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this rate setting?')) {
      deleteRateSettingMutation.mutate(id);
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Rate per Liter</TableHead>
          <TableHead>Effective From</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rateSettings.map((setting) => (
          <TableRow key={setting.id}>
            <TableCell className="font-semibold text-lg">
              {editingId === setting.id ? (
                <Input
                  type="number"
                  step="0.01"
                  value={form.rate_per_liter}
                  onChange={(e) => setForm((f) => ({ ...f, rate_per_liter: e.target.value }))}
                />
              ) : (
                <>₹{setting.rate_per_liter}</>
              )}
            </TableCell>
            <TableCell>
              {editingId === setting.id ? (
                <Input
                  type="date"
                  value={form.effective_from}
                  onChange={(e) => setForm((f) => ({ ...f, effective_from: e.target.value }))}
                />
              ) : (
                formatDate(setting.effective_from)
              )}
            </TableCell>
            <TableCell>
              <Badge variant={setting.is_active ? 'default' : 'secondary'}>
                {setting.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </TableCell>
            <TableCell className="text-right space-x-2">
              {editingId === setting.id ? (
                <>
                  <Button size="sm" variant="default" onClick={() => saveEdit(setting.id)} disabled={updateRateSettingMutation.isPending}>Save</Button>
                  <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={() => startEdit(setting)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(setting.id)} disabled={deleteRateSettingMutation.isPending}>Delete</Button>
                </>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
