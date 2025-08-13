import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useMilkingLog, MilkingSession } from '@/hooks/useMilkingLogs';
import { useToast } from '@/hooks/use-toast';
import { useAppSetting } from '@/hooks/useAppSettings';

export const SessionUnlock: React.FC = () => {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [session, setSession] = useState<MilkingSession>('morning');
  const { log, isLoading, setStartTime, setEndTime, unlockLog } = useMilkingLog(date, session);
  const { toast } = useToast();
  const { value: sessionSettings } = useAppSetting<any>('milking_session_settings');
  const tz = sessionSettings?.timezone || 'Asia/Kolkata';
  const [startAt, setStartAtInput] = useState<string>('05:00');
  const [endAt, setEndAtInput] = useState<string>('06:30');

  const handleSetStart = async () => {
    await setStartTime(date, session, startAt, tz);
    toast({ title: 'Start time set', description: `${session} start set to ${startAt} for ${date}` });
  };
  const handleSetEnd = async () => {
    await setEndTime(date, session, endAt, tz);
    toast({ title: 'End time set', description: `${session} end set to ${endAt} for ${date}` });
  };

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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <Label htmlFor="startAt">Set start time</Label>
            <Input id="startAt" type="time" value={startAt} onChange={(e) => setStartAtInput(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="endAt">Set end time</Label>
            <Input id="endAt" type="time" value={endAt} onChange={(e) => setEndAtInput(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" type="button" onClick={handleSetStart}>Save start</Button>
            <Button variant="outline" type="button" onClick={handleSetEnd}>Save end (lock)</Button>
            <Button type="button" onClick={handleUnlock}>Unlock session</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
