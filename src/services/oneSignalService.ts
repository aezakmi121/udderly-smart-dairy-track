// OneSignal Web Push Notification Service
// App ID is a public key - safe to store in codebase

const ONESIGNAL_APP_ID = '74a41f11-6359-4571-97df-4a4c144b6f3d';

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
      try {
        // Wait for the SDK script to load
        const checkSDK = () => {
          if (typeof window.OneSignal !== 'undefined' || window.OneSignalDeferred) {
            window.OneSignalDeferred = window.OneSignalDeferred || [];
            window.OneSignalDeferred.push(async (OneSignal: any) => {
              try {
                await OneSignal.init({
                  appId: ONESIGNAL_APP_ID,
                  allowLocalhostAsSecureOrigin: true,
                  notifyButton: {
                    enable: false, // We handle the UI ourselves
                  },
                  promptOptions: {
                    autoPrompt: false, // We'll prompt manually after login
                  },
                });
                this.initialized = true;
                console.log('✅ OneSignal initialized successfully');
                resolve(true);
              } catch (error) {
                console.error('❌ OneSignal init failed:', error);
                resolve(false);
              }
            });
          } else {
            // SDK not loaded yet, retry
            setTimeout(checkSDK, 500);
          }
        };

        // Start checking, with a timeout
        checkSDK();
        setTimeout(() => {
          if (!this.initialized) {
            console.warn('⏰ OneSignal SDK did not load within timeout');
            resolve(false);
          }
        }, 10000);
      } catch (error) {
        console.error('OneSignal initialization error:', error);
        resolve(false);
      }
    });

    return this.initPromise;
  }

  async requestPermission(): Promise<boolean> {
    const ok = await this.initialize();
    if (!ok) {
      console.warn('OneSignal not initialized, falling back to native');
      return false;
    }

    try {
      const OneSignal = window.OneSignal;
      if (!OneSignal) return false;

      // Use the native browser prompt via OneSignal
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

      // Wait a moment for the subscription to register
      await new Promise(r => setTimeout(r, 1500));
      const playerId = await OneSignal.User.onesignalId;
      console.log('OneSignal player ID:', playerId);
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
