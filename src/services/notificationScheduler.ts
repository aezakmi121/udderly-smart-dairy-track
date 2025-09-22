import { supabase } from '@/integrations/supabase/client';
import { sessionNotificationService } from './sessionNotificationService';

interface NotificationSchedule {
  id: string;
  title: string;
  message: string;
  scheduleTime: string; // HH:MM format
  type: 'milking_start' | 'milking_end' | 'collection_start' | 'collection_end';
  session?: 'morning' | 'evening';
}

class NotificationScheduler {
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  async scheduleNotifications() {
    // Clear existing intervals
    this.clearAllSchedules();

    // Get app settings for session times
    const { data: settings } = await supabase
      .from('app_settings')
      .select('*');

    if (!settings) return;

    const morningStart = settings.find(s => s.key === 'morning_session_start')?.value as string;
    const morningEnd = settings.find(s => s.key === 'morning_session_end')?.value as string;
    const eveningStart = settings.find(s => s.key === 'evening_session_start')?.value as string;
    const eveningEnd = settings.find(s => s.key === 'evening_session_end')?.value as string;
    const collectionStart = settings.find(s => s.key === 'collection_start_time')?.value as string;
    const collectionEnd = settings.find(s => s.key === 'collection_end_time')?.value as string;

    const schedules: NotificationSchedule[] = [];

    if (morningStart) {
      schedules.push({
        id: 'morning_start',
        title: 'Morning Milking Session',
        message: 'Time to start the morning milking session!',
        scheduleTime: morningStart,
        type: 'milking_start',
        session: 'morning'
      });
    }

    if (morningEnd) {
      schedules.push({
        id: 'morning_end',
        title: 'Morning Milking Complete',
        message: 'Morning milking session should be completed.',
        scheduleTime: morningEnd,
        type: 'milking_end',
        session: 'morning'
      });
    }

    if (eveningStart) {
      schedules.push({
        id: 'evening_start',
        title: 'Evening Milking Session',
        message: 'Time to start the evening milking session!',
        scheduleTime: eveningStart,
        type: 'milking_start',
        session: 'evening'
      });
    }

    if (eveningEnd) {
      schedules.push({
        id: 'evening_end',
        title: 'Evening Milking Complete',
        message: 'Evening milking session should be completed.',
        scheduleTime: eveningEnd,
        type: 'milking_end',
        session: 'evening'
      });
    }

    if (collectionStart) {
      schedules.push({
        id: 'collection_start',
        title: 'Milk Collection Started',
        message: 'Milk collection period has begun.',
        scheduleTime: collectionStart,
        type: 'collection_start'
      });
    }

    if (collectionEnd) {
      schedules.push({
        id: 'collection_end',
        title: 'Milk Collection Ending',
        message: 'Milk collection period is ending soon.',
        scheduleTime: collectionEnd,
        type: 'collection_end'
      });
    }

    // Schedule each notification
    schedules.forEach(schedule => {
      this.scheduleNotification(schedule);
    });
  }

  private scheduleNotification(schedule: NotificationSchedule) {
    const checkAndNotify = () => {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

      if (currentTime === schedule.scheduleTime) {
        this.showNotification(schedule);
      }
    };

    // Check every minute
    const interval = setInterval(checkAndNotify, 60000);
    this.intervals.set(schedule.id, interval);

    // Also check immediately in case we're starting at the right time
    checkAndNotify();
  }

  private async showNotification(schedule: NotificationSchedule) {
    // Check if user has notifications enabled
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Use the new session notification service for better handling
    if (schedule.type === 'milking_start' && schedule.session) {
      await sessionNotificationService.sendSessionStartNotification(schedule.session);
    } else if (schedule.type === 'milking_end' && schedule.session) {
      await sessionNotificationService.sendSessionEndNotification(schedule.session);
    } else if (schedule.type === 'collection_end') {
      await sessionNotificationService.sendMilkCollectionSummary();
    }

    // Also show browser notification if permission is granted
    if (Notification.permission === 'granted') {
      new Notification(schedule.title, {
        body: schedule.message,
        icon: '/android-chrome-192x192.png',
        tag: schedule.type,
        requireInteraction: true
      });
    }
  }

  clearAllSchedules() {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();
  }

  start() {
    this.scheduleNotifications();
    
    // Re-schedule every hour to ensure we have the latest settings
    setInterval(() => {
      this.scheduleNotifications();
    }, 3600000); // 1 hour
  }

  stop() {
    this.clearAllSchedules();
  }
}

export const notificationScheduler = new NotificationScheduler();