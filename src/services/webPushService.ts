import { supabase } from "@/integrations/supabase/client";

class WebPushService {
  private static instance: WebPushService;
  private registration: ServiceWorkerRegistration | null = null;

  private constructor() {}

  static getInstance(): WebPushService {
    if (!WebPushService.instance) {
      WebPushService.instance = new WebPushService();
    }
    return WebPushService.instance;
  }

  async initialize(): Promise<boolean> {
    try {
      // Check if service workers are supported
      if (!('serviceWorker' in navigator)) {
        console.log('Service Workers not supported');
        return false;
      }

      // Check if Push API is supported
      if (!('PushManager' in window)) {
        console.log('Push API not supported');
        return false;
      }

      // Register or get existing service worker
      console.log('Registering service worker...');
      try {
        // Try to get existing registration first
        const existingReg = await navigator.serviceWorker.getRegistration();
        if (existingReg) {
          console.log('Using existing service worker registration');
          this.registration = existingReg;
        } else {
          // Register new service worker if none exists
          console.log('No existing registration, registering new one...');
          this.registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
          });
          console.log('Service worker registered successfully');
        }
      } catch (swError) {
        console.error('Service worker registration failed:', swError);
        // Fall back to waiting for existing registration
        this.registration = await navigator.serviceWorker.ready;
      }
      
      console.log('Service worker ready:', this.registration);
      return true;
    } catch (error) {
      console.error('Error initializing web push:', error);
      return false;
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    const permission = await Notification.requestPermission();
    return permission;
  }

  async subscribe(): Promise<boolean> {
    try {
      console.log('Starting subscription process...');
      
      if (!this.registration) {
        console.log('No registration, initializing...');
        const initialized = await this.initialize();
        if (!initialized) {
          console.log('Initialization failed');
          return false;
        }
      }

      console.log('Requesting notification permission...');
      const permission = await this.requestPermission();
      console.log('Permission result:', permission);
      
      if (permission !== 'granted') {
        console.log('Notification permission denied');
        return false;
      }

      // Get VAPID public key from environment
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      console.log('VAPID key exists:', !!vapidPublicKey);
      
      if (!vapidPublicKey) {
        console.error('VAPID public key not found');
        return false;
      }

      console.log('Subscribing to push manager...');
      // Subscribe to push notifications
      const subscription = await this.registration!.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });

      console.log('Subscription successful, saving to database...');
      // Save subscription to database
      await this.saveSubscription(subscription);

      console.log('Successfully subscribed to web push');
      return true;
    } catch (error) {
      console.error('Error subscribing to web push:', error);
      return false;
    }
  }

  async unsubscribe(): Promise<boolean> {
    try {
      if (!this.registration) return false;

      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await this.removeSubscription();
      }

      return true;
    } catch (error) {
      console.error('Error unsubscribing from web push:', error);
      return false;
    }
  }

  private async saveSubscription(subscription: PushSubscription): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    const subscriptionJson = subscription.toJSON() as any;

    const { error } = await supabase
      .from('profiles')
      .update({
        web_push_subscription: subscriptionJson,
        push_enabled: true,
      })
      .eq('user_id', user.id);

    if (error) throw error;
  }

  private async removeSubscription(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('profiles')
      .update({
        web_push_subscription: null,
        push_enabled: false,
      })
      .eq('user_id', user.id);
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async enableNotifications(): Promise<boolean> {
    const subscribed = await this.subscribe();
    return subscribed;
  }

  async disableNotifications(): Promise<void> {
    await this.unsubscribe();
  }
}

export const webPushService = WebPushService.getInstance();
