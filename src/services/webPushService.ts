import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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

      // Get service worker registration
      this.registration = await navigator.serviceWorker.ready;
      
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
      if (!this.registration) {
        const initialized = await this.initialize();
        if (!initialized) return false;
      }

      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        console.log('Notification permission denied');
        return false;
      }

      // Get VAPID public key from environment
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.error('VAPID public key not found');
        return false;
      }

      // Subscribe to push notifications
      const subscription = await this.registration!.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });

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
    if (subscribed) {
      toast({
        title: "Notifications Enabled",
        description: "You'll receive daily rep notifications",
      });
    } else {
      toast({
        title: "Notifications Failed",
        description: "Unable to enable notifications. Please check your browser settings.",
        variant: "destructive",
      });
    }
    return subscribed;
  }

  async disableNotifications(): Promise<void> {
    await this.unsubscribe();
    toast({
      title: "Notifications Disabled",
      description: "You won't receive daily rep notifications",
    });
  }
}

export const webPushService = WebPushService.getInstance();
