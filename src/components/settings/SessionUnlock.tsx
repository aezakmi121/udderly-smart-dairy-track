import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useMilkingLog, MilkingSession } from '@/hooks/useMilkingLogs';
import { useToast } from '@/hooks/use-toast';

export const SessionUnlock: React.FC = () => {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [session, setSession] = useState<MilkingSession>('morning');
  const { log, isLoading, startLog, endLog, unlockLog } = useMilkingLog(date, session);
  const { toast } = useToast();

  const handleUnlock = async () => {
    await unlockLog(date, session);
    toast({ title: 'Session unlocked', description: `${session} session on ${date} is now open.` });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Milking Session Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Session</Label>
            <RadioGroup value={session} onValueChange={(v) => setSession(v as MilkingSession)} className="flex gap-6">
              <div className="flex items-center space-x-2">
                <RadioGroupItem id="morning" value="morning" />
                <Label htmlFor="morning">Morning</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem id="evening" value="evening" />
                <Label htmlFor="evening">Evening</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="rounded-md border p-3 text-sm">
          {isLoading ? (
            <p>Loading session status…</p>
          ) : log ? (
            <div className="space-y-1">
              <p><span className="font-medium">Start:</span> {log.milking_start_time ? new Date(log.milking_start_time).toLocaleString() : 'Not started'}</p>
              <p><span className="font-medium">End:</span> {log.milking_end_time ? new Date(log.milking_end_time).toLocaleString() : 'Not ended (unlocked)'}
              </p>
            </div>
          ) : (
            <p>No log found for this date/session.</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" type="button" onClick={() => startLog(date, session)}>Set start time now</Button>
          <Button variant="outline" type="button" onClick={() => endLog(date, session)}>Set end time now (lock)</Button>
          <Button type="button" onClick={handleUnlock}>Unlock session</Button>
        </div>
      </CardContent>
    </Card>
  );
};
