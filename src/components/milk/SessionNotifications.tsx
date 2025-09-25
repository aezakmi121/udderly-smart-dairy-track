import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { toZonedTime } from 'date-fns-tz';

interface SessionNotificationsProps {
  sessionSettings: any;
  selectedSession: 'morning' | 'evening';
  selectedDate: string;
  milkingLog: any;
  timezone: string;
}

export const SessionNotifications: React.FC<SessionNotificationsProps> = ({
  sessionSettings,
  selectedSession,
  selectedDate,
  milkingLog,
  timezone
}) => {
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [sessionStatus, setSessionStatus] = useState<'before' | 'active' | 'after' | 'disabled'>('disabled');
  const [timeToStart, setTimeToStart] = useState<string>('');
  const [timeToEnd, setTimeToEnd] = useState<string>('');

  useEffect(() => {
    if (!sessionSettings || !sessionSettings.enforceWindow) {
      setSessionStatus('disabled');
      return;
    }

    const updateTime = () => {
      const now = new Date();
      const nowInTimezone = toZonedTime(now, timezone);
      const currentTime = nowInTimezone.toTimeString().slice(0, 5);
      const currentSeconds = nowInTimezone.getSeconds();
      setCurrentTimeStr(`${currentTime}:${currentSeconds.toString().padStart(2, '0')} (${timezone})`);

      const sessionWindow = sessionSettings[selectedSession];
      if (!sessionWindow) {
        setSessionStatus('disabled');
        return;
      }

      const isAfterStart = currentTime >= sessionWindow.start;
      const isBeforeEnd = currentTime <= sessionWindow.end;

      if (!isAfterStart) {
        setSessionStatus('before');
        setTimeToStart(calculateTimeUntilWithSeconds(nowInTimezone, sessionWindow.start));
      } else if (isAfterStart && isBeforeEnd) {
        setSessionStatus('active');
        setTimeToEnd(calculateTimeUntilWithSeconds(nowInTimezone, sessionWindow.end));
      } else {
        setSessionStatus('after');
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [sessionSettings, selectedSession, timezone]);

  const calculateTimeUntilWithSeconds = (nowInTimezone: Date, targetTime: string): string => {
    const [targetHour, targetMinute] = targetTime.split(':').map(Number);
    
    // Create target date for today
    const targetDate = new Date(nowInTimezone);
    targetDate.setHours(targetHour, targetMinute, 0, 0);
    
    // If target time has passed today, set it for tomorrow
    if (targetDate <= nowInTimezone) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    
    const diffMs = targetDate.getTime() - nowInTimezone.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    
    const hours = Math.floor(diffSeconds / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);
    const seconds = diffSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = () => {
    switch (sessionStatus) {
      case 'before':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'after':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusMessage = () => {
    if (!sessionSettings?.enforceWindow) {
      return {
        message: 'Session windows disabled - Access allowed anytime',
        variant: 'secondary' as const
      };
    }

    const sessionWindow = sessionSettings[selectedSession];
    if (!sessionWindow) {
      return {
        message: 'No session window configured',
        variant: 'secondary' as const
      };
    }

    switch (sessionStatus) {
      case 'before':
        return {
          message: `${selectedSession.charAt(0).toUpperCase() + selectedSession.slice(1)} session starts in ${timeToStart} (${sessionWindow.start})`,
          variant: 'outline' as const
        };
      case 'active':
        return {
          message: `${selectedSession.charAt(0).toUpperCase() + selectedSession.slice(1)} session active - Ends in ${timeToEnd} (${sessionWindow.end})`,
          variant: 'default' as const
        };
      case 'after':
        return {
          message: `${selectedSession.charAt(0).toUpperCase() + selectedSession.slice(1)} session ended (${sessionWindow.end})`,
          variant: 'destructive' as const
        };
      default:
        return {
          message: 'Session status unknown',
          variant: 'secondary' as const
        };
    }
  };

  const statusInfo = getStatusMessage();
  const started = !!milkingLog?.milking_start_time;
  const ended = !!milkingLog?.milking_end_time;

  return (
    <Card className="border-l-4 border-l-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm font-medium">Session Status</span>
            <Badge variant={statusInfo.variant}>{sessionStatus === 'disabled' ? 'Unrestricted' : sessionStatus.charAt(0).toUpperCase() + sessionStatus.slice(1)}</Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            {currentTimeStr}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {statusInfo.message}
          </p>

          {(started || ended) && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {started && (
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Started: {new Date(milkingLog.milking_start_time).toLocaleTimeString()}
                </span>
              )}
              {ended && (
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                  Ended: {new Date(milkingLog.milking_end_time).toLocaleTimeString()}
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};