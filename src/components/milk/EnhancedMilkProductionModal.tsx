import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { MilkProductionForm } from './MilkProductionForm';
import { formatCowDate } from '@/lib/pdUtils';
import { Sun, Moon } from 'lucide-react';
import { useAppSetting } from '@/hooks/useAppSettings';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { fromZonedTime } from 'date-fns-tz';

interface EnhancedMilkProductionModalProps {
  selectedRecord?: any;
  selectedDate: string;
  defaultSession?: 'morning' | 'evening';
  onSubmit: (data: any) => void;
  isLoading: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCancel: () => void;
  disabledAdd?: boolean;
}

export const EnhancedMilkProductionModal: React.FC<EnhancedMilkProductionModalProps> = ({
  selectedRecord,
  selectedDate,
  defaultSession,
  onSubmit,
  isLoading,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  onCancel,
  disabledAdd
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [sessionOverride, setSessionOverride] = useState<'morning' | 'evening' | null>(null);
  const [keepOpen, setKeepOpen] = useState(false);
  
  const { value: sessionSettings } = useAppSetting<any>('milking_session_settings');
  const { isAdmin } = useUserPermissions();
  const tz = sessionSettings?.timezone || 'Asia/Kolkata';
  
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;

  // Smart default session based on IST time
  const getSmartDefaultSession = useCallback((): 'morning' | 'evening' => {
    if (defaultSession) return defaultSession;
    
    const now = new Date();
    const istOffset = 5.5 * 60; // IST is UTC+5:30
    const istTime = new Date(now.getTime() + istOffset * 60000);
    const hour = istTime.getHours();
    
    return hour < 12 ? 'morning' : 'evening';
  }, [defaultSession]);

  // Compute effective session
  const effectiveSession = selectedRecord?.session ?? sessionOverride ?? getSmartDefaultSession();

  // Check if we're within session window for a given session
  const isWithinSessionWindow = (session: 'morning' | 'evening'): boolean => {
    // Admins can always access both sessions
    if (isAdmin) return true;
    
    // If enforceWindow is disabled, allow access
    if (!sessionSettings?.enforceWindow) return true;
    
    // If no session settings exist, allow access
    if (!sessionSettings) return true;
    
    const sessionWindow = sessionSettings[session];
    if (!sessionWindow) return true;
    
    try {
      // Create proper timestamps using the configured timezone
      const selectedDateStr = selectedDate;
      const startTime = `${selectedDateStr}T${sessionWindow.start}:00`;
      const endTime = `${selectedDateStr}T${sessionWindow.end}:00`;
      
      const startTs = fromZonedTime(startTime, tz).getTime();
      const endTs = fromZonedTime(endTime, tz).getTime();
      const nowTs = Date.now();
      
      console.log('Session window check:', {
        session,
        selectedDate: selectedDateStr,
        sessionWindow,
        startTime,
        endTime,
        startTs: new Date(startTs).toISOString(),
        endTs: new Date(endTs).toISOString(),
        nowTs: new Date(nowTs).toISOString(),
        isWithin: nowTs >= startTs && nowTs <= endTs
      });
      
      return nowTs >= startTs && nowTs <= endTs;
    } catch (error) {
      console.error('Error checking session window:', error);
      return false;
    }
  };

  // Handle quick session triggers
  const handleQuickSession = (session: 'morning' | 'evening') => {
    setSessionOverride(session);
    setOpen(true);
  };

  // Handle submit with keep-open logic
  const handleSubmit = useCallback((data: any) => {
    onSubmit(data);
    
    if (keepOpen && !selectedRecord) {
      // Keep modal open for adding another record
      // The parent component should handle closing on success
      // and we'll reopen it after a brief delay
      setTimeout(() => {
        setOpen(true);
      }, 100);
    }
  }, [onSubmit, keepOpen, selectedRecord, setOpen]);

  // Handle modal close - prevent during loading
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen && isLoading) {
      // Block close during submit
      return;
    }
    
    if (!newOpen) {
      setSessionOverride(null);
    }
    
    setOpen(newOpen);
  }, [isLoading, setOpen]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setSessionOverride(null);
    onCancel();
  }, [onCancel]);

  // Keyboard event handling to block Esc during loading
  useEffect(() => {
    if (!open || !isLoading) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [open, isLoading]);

  return (
    <>
      {/* Quick Session Triggers */}
      <div className="flex gap-2">
        <Button 
          variant="outline"
          size="sm"
          className="flex-1 sm:flex-initial"
          onClick={() => handleQuickSession('morning')}
          disabled={disabledAdd || !isWithinSessionWindow('morning')}
          title={
            disabledAdd 
              ? 'Session ended — adding is locked' 
              : !isWithinSessionWindow('morning')
              ? 'Morning session time window has passed'
              : 'Add morning record'
          }
        >
          <Sun className="h-4 w-4 mr-2" />
          Add Morning
        </Button>
        
        <Button 
          variant="outline"
          size="sm"
          className="flex-1 sm:flex-initial"
          onClick={() => handleQuickSession('evening')}
          disabled={disabledAdd || !isWithinSessionWindow('evening')}
          title={
            disabledAdd 
              ? 'Session ended — adding is locked' 
              : !isWithinSessionWindow('evening')
              ? 'Evening session time window has passed'
              : 'Add evening record'
          }
        >
          <Moon className="h-4 w-4 mr-2" />
          Add Evening
        </Button>
      </div>

        {/* Main Modal */}
        <Dialog 
          open={open} 
          onOpenChange={handleOpenChange}
        >

        <DialogContent 
          className="max-w-lg"
          onPointerDownOutside={isLoading ? (e) => e.preventDefault() : undefined}
          onEscapeKeyDown={isLoading ? (e) => e.preventDefault() : undefined}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>
                {selectedRecord ? 'Edit Production Record' : 'Add Production Record'}
              </span>
              
              {/* Context Badges */}
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="text-xs">
                  {formatCowDate(selectedDate)}
                </Badge>
                <Badge 
                  variant={effectiveSession === 'morning' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {effectiveSession}
                </Badge>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <MilkProductionForm
              selectedRecord={selectedRecord}
              selectedDate={selectedDate}
              defaultSession={effectiveSession}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isLoading={isLoading}
            />
            
            {/* Keep Open Option */}
            {!selectedRecord && (
              <div className="flex items-center space-x-2 pt-2 border-t">
                <Checkbox 
                  id="keep-open" 
                  checked={keepOpen}
                  onCheckedChange={(checked) => setKeepOpen(!!checked)}
                />
                <Label 
                  htmlFor="keep-open" 
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  Keep open to add another
                </Label>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
