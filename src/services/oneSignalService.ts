// OneSignal Web Push Notification Service
// App ID is a public key - safe to store in codebase
// Will be set after user creates OneSignal account

const ONESIGNAL_APP_ID = '74a41f11-6359-4571-97df-4a4c144b6f3d';

interface OneSignalWindow extends Window {
  OneSignalDeferred?: Array<(OneSignal: any) => void>;
  OneSignal?: any;
}

declare const window: OneSignalWindow;

class OneSignalService {
  private initialized = false;

  async initialize(): Promise<boolean> {
    if (this.initialized) return true;
    if (!ONESIGNAL_APP_ID) {
      console.warn('OneSignal App ID not configured');
      return false;
    }

    try {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      
      return new Promise<boolean>((resolve) => {
        window.OneSignalDeferred!.push(async (OneSignal: any) => {
          try {
            await OneSignal.init({
              appId: ONESIGNAL_APP_ID,
              allowLocalhostAsSecureOrigin: true,
              serviceWorkerParam: { scope: '/push/onesignal/' },
              serviceWorkerPath: 'push/onesignal/OneSignalSDKWorker.js',
            });
            this.initialized = true;
            console.log('✅ OneSignal initialized');
            resolve(true);
          } catch (error) {
            console.error('❌ OneSignal init failed:', error);
            resolve(false);
          }
        });
      });
    } catch (error) {
      console.error('OneSignal initialization error:', error);
      return false;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!this.initialized) {
      const ok = await this.initialize();
      if (!ok) return false;
    }

    try {
      const OneSignal = window.OneSignal;
      if (!OneSignal) return false;

      await OneSignal.Slidedown.promptPush();
      const permission = await OneSignal.Notifications.permission;
      return permission;
    } catch (error) {
      console.error('OneSignal permission error:', error);
      return false;
    }
  }

  async getPlayerId(): Promise<string | null> {
    try {
      const OneSignal = window.OneSignal;
      if (!OneSignal) return null;

      const playerId = await OneSignal.User.onesignalId;
      return playerId || null;
    } catch (error) {
      console.error('Error getting OneSignal player ID:', error);
      return null;
    }
  }

  async setExternalUserId(userId: string): Promise<void> {
    try {
      const OneSignal = window.OneSignal;
      if (!OneSignal) return;

      await OneSignal.login(userId);
      console.log('OneSignal external user ID set:', userId);
    } catch (error) {
      console.error('Error setting external user ID:', error);
    }
  }

  async setUserTags(tags: Record<string, string>): Promise<void> {
    try {
      const OneSignal = window.OneSignal;
      if (!OneSignal) return;

      await OneSignal.User.addTags(tags);
      console.log('OneSignal tags set:', tags);
    } catch (error) {
      console.error('Error setting OneSignal tags:', error);
    }
  }

  async isSubscribed(): Promise<boolean> {
    try {
      const OneSignal = window.OneSignal;
      if (!OneSignal) return false;

      const permission = await OneSignal.Notifications.permission;
      return permission;
    } catch {
      return false;
    }
  }

  isConfigured(): boolean {
    return !!ONESIGNAL_APP_ID;
  }
}

export const oneSignalService = new OneSignalService();
