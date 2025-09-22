import { supabase } from '@/integrations/supabase/client';

interface SessionNotificationData {
  type: 'session_start' | 'session_end' | 'milk_collection_summary';
  sessionType?: 'morning' | 'evening';
  totalMilk?: number;
  totalAmount?: number;
}

class SessionNotificationService {
  private async getUserTokens(): Promise<string[]> {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('fcm_token')
      .not('fcm_token', 'is', null);
    
    return profiles?.map(p => p.fcm_token).filter(Boolean) || [];
  }

  async sendSessionStartNotification(sessionType: 'morning' | 'evening'): Promise<void> {
    try {
      const tokens = await this.getUserTokens();
      if (tokens.length === 0) return;

      const title = `${sessionType.charAt(0).toUpperCase() + sessionType.slice(1)} Milking Session`;
      const body = `Time to start the ${sessionType} milking session! 🐄`;

      await supabase.functions.invoke('send-push-notification', {
        body: {
          tokens,
          title,
          body,
          data: {
            type: 'session_start',
            sessionType,
            timestamp: new Date().toISOString()
          }
        }
      });

      console.log(`Sent ${sessionType} session start notification to ${tokens.length} devices`);
    } catch (error) {
      console.error('Error sending session start notification:', error);
    }
  }

  async sendSessionEndNotification(sessionType: 'morning' | 'evening'): Promise<void> {
    try {
      const tokens = await this.getUserTokens();
      if (tokens.length === 0) return;

      const title = `${sessionType.charAt(0).toUpperCase() + sessionType.slice(1)} Milking Complete`;
      const body = `${sessionType} milking session should be completed. Please finish up! ✅`;

      await supabase.functions.invoke('send-push-notification', {
        body: {
          tokens,
          title,
          body,
          data: {
            type: 'session_end',
            sessionType,
            timestamp: new Date().toISOString()
          }
        }
      });

      console.log(`Sent ${sessionType} session end notification to ${tokens.length} devices`);
    } catch (error) {
      console.error('Error sending session end notification:', error);
    }
  }

  async sendMilkCollectionSummary(): Promise<void> {
    try {
      const tokens = await this.getUserTokens();
      if (tokens.length === 0) return;

      // Get today's milk collection data
      const today = new Date().toISOString().split('T')[0];
      const { data: collections } = await supabase
        .from('milk_collections')
        .select('quantity, total_amount')
        .eq('collection_date', today);

      if (!collections || collections.length === 0) {
        return; // No collections today
      }

      const totalMilk = collections.reduce((sum, c) => sum + (c.quantity || 0), 0);
      const totalAmount = collections.reduce((sum, c) => sum + (c.total_amount || 0), 0);

      const title = 'Daily Milk Collection Summary';
      const body = `Today's collection: ${totalMilk.toFixed(1)}L collected, Rs.${totalAmount.toFixed(2)} earned 📊`;

      await supabase.functions.invoke('send-push-notification', {
        body: {
          tokens,
          title,
          body,
          data: {
            type: 'milk_collection_summary',
            totalMilk: totalMilk.toString(),
            totalAmount: totalAmount.toString(),
            date: today,
            timestamp: new Date().toISOString()
          }
        }
      });

      console.log(`Sent milk collection summary to ${tokens.length} devices: ${totalMilk}L, Rs.${totalAmount}`);
    } catch (error) {
      console.error('Error sending milk collection summary:', error);
    }
  }

  async checkAndSendSessionNotifications(): Promise<void> {
    try {
      // Get app settings for session times
      const { data: settings } = await supabase
        .from('app_settings')
        .select('*');

      if (!settings) return;

      const morningStart = settings.find(s => s.key === 'morning_session_start')?.value as string;
      const morningEnd = settings.find(s => s.key === 'morning_session_end')?.value as string;
      const eveningStart = settings.find(s => s.key === 'evening_session_start')?.value as string;
      const eveningEnd = settings.find(s => s.key === 'evening_session_end')?.value as string;
      const collectionEnd = settings.find(s => s.key === 'collection_end_time')?.value as string;

      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

      // Check for session start times
      if (morningStart === currentTime) {
        await this.sendSessionStartNotification('morning');
      }
      if (eveningStart === currentTime) {
        await this.sendSessionStartNotification('evening');
      }

      // Check for session end times
      if (morningEnd === currentTime) {
        await this.sendSessionEndNotification('morning');
      }
      if (eveningEnd === currentTime) {
        await this.sendSessionEndNotification('evening');
      }

      // Check for daily collection summary (at end of collection time)
      if (collectionEnd === currentTime) {
        await this.sendMilkCollectionSummary();
      }

    } catch (error) {
      console.error('Error checking session notifications:', error);
    }
  }

  // Method to be called when milk production is completed for a session
  async onMilkProductionComplete(sessionType: 'morning' | 'evening'): Promise<void> {
    try {
      const tokens = await this.getUserTokens();
      if (tokens.length === 0) return;

      // Get session's milk production
      const today = new Date().toISOString().split('T')[0];
      const { data: productions } = await supabase
        .from('milk_production')
        .select('quantity')
        .eq('production_date', today)
        .eq('session', sessionType);

      if (!productions || productions.length === 0) return;

      const totalMilk = productions.reduce((sum, p) => sum + (p.quantity || 0), 0);

      const title = `${sessionType.charAt(0).toUpperCase() + sessionType.slice(1)} Session Complete`;
      const body = `${sessionType} milking completed! Total: ${totalMilk.toFixed(1)}L collected 🥛`;

      await supabase.functions.invoke('send-push-notification', {
        body: {
          tokens,
          title,
          body,
          data: {
            type: 'session_complete',
            sessionType,
            totalMilk: totalMilk.toString(),
            timestamp: new Date().toISOString()
          }
        }
      });

      console.log(`Sent ${sessionType} session complete notification: ${totalMilk}L`);
    } catch (error) {
      console.error('Error sending session complete notification:', error);
    }
  }
}

export const sessionNotificationService = new SessionNotificationService();