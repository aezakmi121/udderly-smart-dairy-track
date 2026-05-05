import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload } from 'lucide-react';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useUploadStatement } from '@/hooks/useStatementImports';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export const ImportStatementDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const { data: accounts = [] } = useBankAccounts();
  const upload = useUploadStatement();

  const [bankAccountId, setBankAccountId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);

  const activeAccounts = accounts.filter(a => a.is_active);

  const handleUpload = async () => {
    if (!file || !bankAccountId) return;
    const res = await upload.mutateAsync({ file, bankAccountId });
    if (res?.import_id) {
      onOpenChange(false);
      setFile(null);
      setBankAccountId('');
      navigate(`/expenses/import/${res.import_id}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Bank Statement</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label className="text-sm">Bank Account</Label>
            <Select value={bankAccountId} onValueChange={setBankAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose bank account" />
              </SelectTrigger>
              <SelectContent>
                {activeAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} — {a.bank_name}{a.last4 ? ` ••${a.last4}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeAccounts.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Add a bank account from Expense Settings first.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-sm">PDF Statement</Label>
            <Input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleUpload} disabled={!file || !bankAccountId || upload.isPending}>
            {upload.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Parsing…</>
            ) : (
              <><Upload className="h-4 w-4 mr-2" /> Upload & Parse</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
