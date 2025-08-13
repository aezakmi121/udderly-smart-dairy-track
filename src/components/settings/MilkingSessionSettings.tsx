import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useAppSetting } from '@/hooks/useAppSettings';

interface SessionSettings {
  auto: boolean;
  timezone: string;
  enforceWindow?: boolean;
  morning: { start: string; end: string };
  evening: { start: string; end: string };
}

const defaultSettings: SessionSettings = {
  auto: true,
  timezone: 'Asia/Kolkata',
  enforceWindow: true,
  morning: { start: '05:00', end: '06:30' },
  evening: { start: '17:00', end: '18:30' },
};

export const MilkingSessionSettings: React.FC = () => {
  const { value, saveAsync, isSaving } = useAppSetting<SessionSettings>('milking_session_settings');
  const initial = useMemo<SessionSettings>(() => ({ ...defaultSettings, ...(value || {}) }), [value]);
  const [form, setForm] = useState<SessionSettings>(initial);

  React.useEffect(() => setForm(initial), [initial]);

  const handleSave = async () => {
    await saveAsync(form);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Milking Session Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto">Enable automatic sessions</Label>
              <Switch id="auto" checked={form.auto} onCheckedChange={(v) => setForm({ ...form, auto: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="enforceWindow">Restrict edits outside window</Label>
              <Switch id="enforceWindow" checked={!!form.enforceWindow} onCheckedChange={(v) => setForm({ ...form, enforceWindow: v })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone (IANA)</Label>
              <Input id="timezone" placeholder="Asia/Kolkata" value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Morning session</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="mStart" className="text-xs">Start</Label>
                  <Input id="mStart" type="time" value={form.morning.start}
                    onChange={(e) => setForm({ ...form, morning: { ...form.morning, start: e.target.value } })} />
                </div>
                <div>
                  <Label htmlFor="mEnd" className="text-xs">End</Label>
                  <Input id="mEnd" type="time" value={form.morning.end}
                    onChange={(e) => setForm({ ...form, morning: { ...form.morning, end: e.target.value } })} />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Evening session</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="eStart" className="text-xs">Start</Label>
                  <Input id="eStart" type="time" value={form.evening.start}
                    onChange={(e) => setForm({ ...form, evening: { ...form.evening, start: e.target.value } })} />
                </div>
                <div>
                  <Label htmlFor="eEnd" className="text-xs">End</Label>
                  <Input id="eEnd" type="time" value={form.evening.end}
                    onChange={(e) => setForm({ ...form, evening: { ...form.evening, end: e.target.value } })} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving…' : 'Save settings'}</Button>
        </div>
      </CardContent>
    </Card>
  );
};
