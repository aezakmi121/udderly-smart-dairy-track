// Native Web Push service using VAPID + browser PushManager.
// Replaces oneSignalService.ts.
import { supabase } from '@/integrations/supabase/client';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function bufferToBase64Url(buf: ArrayBuffer | null): string {
  if (!buf) return '';
  const bytes = new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

class WebPushService {
  isConfigured(): boolean {
    return !!VAPID_PUBLIC_KEY;
  }

  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  getPermission(): NotificationPermission {
    return typeof Notification !== 'undefined' ? Notification.permission : 'default';
  }

  private async getRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) return null;
    try {
      const existing = await navigator.serviceWorker.getRegistration('/');
      const reg = existing ?? await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      // Tell SW where to POST diagnostics events
      try {
        const supaUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
        const base = supaUrl ? `${supaUrl}/functions/v1` : '';
        const target = reg.active || reg.waiting || reg.installing;
        target?.postMessage({ type: 'SET_API_BASE', base });
      } catch {}
      return reg;
    } catch (e) {
      console.error('[webPush] SW register failed', e);
      return null;
    }
  }

  async getSubscription(): Promise<PushSubscription | null> {
    const reg = await this.getRegistration();
    if (!reg) return null;
    return reg.pushManager.getSubscription();
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) return 'denied';
    if (Notification.permission === 'granted') return 'granted';
    return Notification.requestPermission();
  }

  async subscribe(userId: string): Promise<PushSubscription | null> {
    if (!this.isConfigured()) throw new Error('VAPID public key not set');
    const reg = await this.getRegistration();
    if (!reg) throw new Error('Service worker unavailable');

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const keyBytes = urlBase64ToUint8Array(VAPID_PUBLIC_KEY!);
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes.buffer.slice(keyBytes.byteOffset, keyBytes.byteOffset + keyBytes.byteLength) as ArrayBuffer,
      });
    }

    const p256dh = bufferToBase64Url(sub.getKey('p256dh'));
    const auth = bufferToBase64Url(sub.getKey('auth'));

    // Upsert by endpoint (unique). Delete then insert keeps RLS simple.
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    const { error } = await supabase.from('push_subscriptions').insert({
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh,
      auth,
      user_agent: navigator.userAgent.slice(0, 500),
    } as any);
    if (error) {
      console.error('[webPush] DB insert failed', error);
      throw error;
    }

    return sub;
  }

  async unsubscribe(): Promise<void> {
    const reg = await this.getRegistration();
    if (!reg) return;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    const endpoint = sub.endpoint;
    try {
      await sub.unsubscribe();
    } catch (e) {
      console.error('[webPush] unsubscribe error', e);
    }
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  }
}

export const webPushService = new WebPushService();
