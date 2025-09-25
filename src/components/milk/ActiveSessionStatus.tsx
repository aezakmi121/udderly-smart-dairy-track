import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Sun, Moon } from 'lucide-react';
import { toZonedTime } from 'date-fns-tz';

interface ActiveSessionStatusProps {
  sessionSettings: any;
  timezone?: string;
}

export const ActiveSessionStatus: React.FC<ActiveSessionStatusProps> = ({
  sessionSettings,
  timezone = 'Asia/Kolkata'
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeUntilEnd, setTimeUntilEnd] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<'morning' | 'evening' | null>(null);

  useEffect(() => {
    const updateStatus = () => {
      const now = new Date();
      setCurrentTime(now);
      
      if (!sessionSettings?.enforceWindow) {
        setActiveSession(null);
        setTimeUntilEnd(null);
        return;
      }

      try {
        const nowInTz = toZonedTime(now, timezone);
        const currentTimeStr = nowInTz.toTimeString().slice(0, 5); // HH:MM format

        // Check morning session
        const morningStart = sessionSettings.morning?.start || '05:00';
        const morningEnd = sessionSettings.morning?.end || '07:00';
        const isMorningActive = currentTimeStr >= morningStart && currentTimeStr <= morningEnd;

        // Check evening session
        const eveningStart = sessionSettings.evening?.start || '17:00';
        const eveningEnd = sessionSettings.evening?.end || '18:30';
        const isEveningActive = currentTimeStr >= eveningStart && currentTimeStr <= eveningEnd;

        if (isMorningActive) {
          setActiveSession('morning');
          const endTime = calculateTimeUntilEnd(currentTimeStr, morningEnd);
          setTimeUntilEnd(endTime);
        } else if (isEveningActive) {
          setActiveSession('evening');
          const endTime = calculateTimeUntilEnd(currentTimeStr, eveningEnd);
          setTimeUntilEnd(endTime);
        } else {
          setActiveSession(null);
          setTimeUntilEnd(null);
        }
      } catch (error) {
        console.error('Error updating session status:', error);
        setActiveSession(null);
        setTimeUntilEnd(null);
      }
    };

    // Update immediately
    updateStatus();

    // Update every 30 seconds
    const interval = setInterval(updateStatus, 30000);

    return () => clearInterval(interval);
  }, [sessionSettings, timezone]);

  const calculateTimeUntilEnd = (currentTime: string, endTime: string): string => {
    const [currentHour, currentMinute] = currentTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const currentTotalMinutes = currentHour * 60 + currentMinute;
    const endTotalMinutes = endHour * 60 + endMinute;

    const diffMinutes = endTotalMinutes - currentTotalMinutes;

    if (diffMinutes <= 0) return '0m';

    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  if (!activeSession) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <Badge variant={activeSession === 'morning' ? 'default' : 'secondary'} className="flex items-center gap-1">
        {activeSession === 'morning' ? (
          <Sun className="h-3 w-3" />
        ) : (
          <Moon className="h-3 w-3" />
        )}
        {activeSession === 'morning' ? 'Morning' : 'Evening'} Session Active
      </Badge>
      
      {timeUntilEnd && (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Closes in {timeUntilEnd}</span>
        </div>
      )}
    </div>
  );
};