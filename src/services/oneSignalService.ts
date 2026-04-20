// OneSignal Web Push Notification Service
// App ID is a public key — safe to store in codebase
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
    if (!ONESIGNAL_APP_ID) return false;

    this.initPromise = new Promise<boolean>((resolve) => {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          await OneSignal.init({
            appId: ONESIGNAL_APP_ID,
            allowLocalhostAsSecureOrigin: true,
            notifyButton: { enable: false },
            promptOptions: { autoPrompt: false },
            serviceWorkerPath: '/OneSignalSDKWorker.js',
          });
          this.initialized = true;
          resolve(true);
        } catch (error: any) {
          console.error('OneSignal init failed:', error?.message || error);
          resolve(false);
        }
      });

      setTimeout(() => {
        if (!this.initialized) {
          console.warn('OneSignal SDK did not load in time (ad blocker?)');
          resolve(false);
        }
      }, 10000);
    });

    return this.initPromise;
  }

  // Ask browser for notification permission. Shows the system prompt only the
  // very first time — browsers never re-show it once granted/denied.
  async requestPermission(): Promise<boolean> {
    const ok = await this.initialize();
    if (!ok) return false;
    try {
      const OneSignal = window.OneSignal;
      if (!OneSignal) return false;
      await OneSignal.Notifications.requestPermission();
      return !!OneSignal.Notifications.permission;
    } catch (error) {
      console.error('OneSignal requestPermission error:', error);
      return false;
    }
  }

  // Resume push delivery for this browser (call on enable/re-enable)
  async optIn(): Promise<void> {
    await this.initialize();
    const OneSignal = window.OneSignal;
    if (!OneSignal) return;
    try {
      await OneSignal.User?.PushSubscription?.optIn?.();
    } catch (error) {
      console.error('OneSignal optIn error:', error);
    }
  }

  // Pause push delivery for this browser without revoking browser permission
  async optOut(): Promise<void> {
    await this.initialize();
    const OneSignal = window.OneSignal;
    if (!OneSignal) return;
    try {
      await OneSignal.User?.PushSubscription?.optOut?.();
    } catch (error) {
      console.error('OneSignal optOut error:', error);
    }
  }

  // Returns true when the subscription is active and opted in
  async isOptedIn(): Promise<boolean> {
    const OneSignal = window.OneSignal;
    if (!OneSignal) return false;
    try {
      return !!OneSignal.User?.PushSubscription?.optedIn;
    } catch {
      return false;
    }
  }

  // Associate this device with a user account
  async login(userId: string): Promise<void> {
    const OneSignal = window.OneSignal;
    if (!OneSignal) return;
    try {
      await OneSignal.login(userId);
    } catch (error) {
      console.error('OneSignal login error:', error);
    }
  }

  // Remove user association (call on disable/sign-out)
  async logout(): Promise<void> {
    await this.initialize();
    const OneSignal = window.OneSignal;
    if (!OneSignal) return;
    try {
      await OneSignal.logout();
    } catch (error) {
      console.error('OneSignal logout error:', error);
    }
  }

  // Returns current subscription debug info
  async getSubscriptionStatus(): Promise<{ optedIn: boolean; subscriptionId: string | null; sdkReady: boolean }> {
    const sdkReady = await this.initialize();
    if (!sdkReady) return { optedIn: false, subscriptionId: null, sdkReady: false };
    const OneSignal = window.OneSignal;
    if (!OneSignal) return { optedIn: false, subscriptionId: null, sdkReady: false };
    try {
      const optedIn = !!OneSignal.User?.PushSubscription?.optedIn;
      const subscriptionId =
        OneSignal.User?.PushSubscription?.id ??
        OneSignal.User?.onesignalId ??
        null;
      return { optedIn, subscriptionId, sdkReady: true };
    } catch {
      return { optedIn: false, subscriptionId: null, sdkReady: true };
    }
  }

  // Poll for the subscription ID after optIn (up to 6s)
  async getPlayerId(): Promise<string | null> {
    const OneSignal = window.OneSignal;
    if (!OneSignal) return null;
    try {
      for (let i = 0; i < 12; i++) {
        const id =
          OneSignal.User?.PushSubscription?.id ??
          OneSignal.User?.onesignalId ??
          null;
        if (id) return id;
        await new Promise(r => setTimeout(r, 500));
      }
      console.warn('OneSignal subscription ID not available after polling');
      return null;
    } catch (error) {
      console.error('Error getting OneSignal player ID:', error);
      return null;
    }
  }

  isConfigured(): boolean {
    return !!ONESIGNAL_APP_ID;
  }
}

export const oneSignalService = new OneSignalService();
