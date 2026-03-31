// OneSignal Web Push Notification Service
// App ID is a public key - safe to store in codebase

const ONESIGNAL_APP_ID = 'efffe468-6b7a-49fd-a276-44efbba13de6';

interface OneSignalWindow extends Window {
  OneSignalDeferred?: Array<(OneSignal: any) => void>;
  OneSignal?: any;
}

declare const window: OneSignalWindow;

class OneSignalService {
  private initialized = false;
  private initPromise: Promise<boolean> | null = null;

  async initialize(): Promise<boolean> {
    if (this.initialized) return true;
    if (this.initPromise) return this.initPromise;
    if (!ONESIGNAL_APP_ID) {
      console.warn('OneSignal App ID not configured');
      return false;
    }

    this.initPromise = new Promise<boolean>((resolve) => {
      // Always push to OneSignalDeferred — the SDK page script sets this up
      // and will invoke our callback once it's ready, whether it loads before
      // or after this code runs.
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          await OneSignal.init({
            appId: ONESIGNAL_APP_ID,
            allowLocalhostAsSecureOrigin: true,
            notifyButton: { enable: false },
            promptOptions: { autoPrompt: false },
          });
          this.initialized = true;
          console.log('✅ OneSignal initialized successfully');
          resolve(true);
        } catch (error) {
          console.error('❌ OneSignal init failed:', error);
          resolve(false);
        }
      });

      // Timeout safety net — if SDK script never loads (e.g. blocked by ad blocker)
      setTimeout(() => {
        if (!this.initialized) {
          console.warn('⏰ OneSignal SDK did not load within timeout');
          resolve(false);
        }
      }, 10000);
    });

    return this.initPromise;
  }

  async requestPermission(): Promise<boolean> {
    const ok = await this.initialize();
    if (!ok) {
      console.warn('OneSignal not initialized');
      return false;
    }

    try {
      const OneSignal = window.OneSignal;
      if (!OneSignal) return false;

      await OneSignal.Notifications.requestPermission();
      const permission = OneSignal.Notifications.permission;
      console.log('OneSignal permission result:', permission);
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

      // Poll for the subscription ID to become available (up to 5s)
      for (let i = 0; i < 10; i++) {
        const id = OneSignal.User?.PushSubscription?.id ?? OneSignal.User?.onesignalId ?? null;
        if (id) {
          console.log('OneSignal subscription ID:', id);
          return id;
        }
        await new Promise(r => setTimeout(r, 500));
      }

      console.warn('OneSignal subscription ID not available after polling');
      return null;
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

      return OneSignal.Notifications.permission;
    } catch {
      return false;
    }
  }

  isConfigured(): boolean {
    return !!ONESIGNAL_APP_ID;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const oneSignalService = new OneSignalService();
