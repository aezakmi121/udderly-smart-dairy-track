import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Building2 } from 'lucide-react';
import { useBankAccounts } from '@/hooks/useBankAccounts';

export const BankAccountsSettings = () => {
  const { data: accounts = [], isLoading, create, remove } = useBankAccounts();
  const [form, setForm] = useState({ name: '', bank_name: '', last4: '' });

  const handleAdd = async () => {
    if (!form.name || !form.bank_name) return;
    await create.mutateAsync(form);
    setForm({ name: '', bank_name: '', last4: '' });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3 p-4 border rounded-lg">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Account Nickname</Label>
            <Input
              placeholder="e.g. Main Current"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Bank Name</Label>
            <Input
              placeholder="e.g. HDFC"
              value={form.bank_name}
              onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Last 4 digits (optional)</Label>
            <Input
              placeholder="1234"
              maxLength={4}
              value={form.last4}
              onChange={(e) => setForm({ ...form, last4: e.target.value.replace(/\D/g, '') })}
            />
          </div>
        </div>
        <Button onClick={handleAdd} disabled={create.isPending} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" /> Add Bank Account
        </Button>
      </div>

      <div className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {accounts.filter(a => a.is_active).map((a) => (
          <Card key={a.id}>
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">{a.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.bank_name}{a.last4 ? ` ••${a.last4}` : ''}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => remove.mutate(a.id)}
                disabled={remove.isPending}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {!isLoading && accounts.filter(a => a.is_active).length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No bank accounts yet.</p>
        )}
      </div>
    </div>
  );
};
