import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export class PushNotificationService {
  private static instance: PushNotificationService;
  private toast: any;

  private constructor() {}

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  setToast(toast: any) {
    this.toast = toast;
  }

  async initialize(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      console.log('Push notifications only available on mobile platforms');
      return false;
    }

    try {
      // Request permission for push notifications
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.log('User denied push notification permissions');
        return false;
      }

      // Register for push notifications
      await PushNotifications.register();

      // Add listeners
      await this.addListeners();

      return true;
    } catch (error) {
      console.error('Error initializing push notifications:', error);
      return false;
    }
  }

  private async addListeners() {
    // On registration
    await PushNotifications.addListener('registration', async (token) => {
      console.log('Push registration success, token: ' + token.value);
      await this.saveDeviceToken(token.value);
    });

    // On registration error
    await PushNotifications.addListener('registrationError', (err) => {
      console.error('Registration error: ', err.error);
    });

    // On notification received (app in foreground)
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push notification received: ', notification);
      
      if (this.toast) {
        this.toast({
          title: notification.title || 'New Daily Rep!',
          description: notification.body || 'Your daily rep is ready',
        });
      }
    });

    // On notification action performed (tap)
    await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push notification action performed', notification.actionId, notification.inputValue);
      
      // Handle deep linking to rep detail
      const data = notification.notification.data;
      if (data?.repId) {
        // Navigate to rep detail page
        window.location.href = `/rep/${data.repId}`;
      }
    });
  }

  private async saveDeviceToken(token: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_profiles')
        .update({
          push_token: token,
          push_enabled: true
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error saving device token:', error);
      } else {
        console.log('Device token saved successfully');
      }
    } catch (error) {
      console.error('Error in saveDeviceToken:', error);
    }
  }

  async enableNotifications(): Promise<boolean> {
    const success = await this.initialize();
    if (success) {
      // Update user preference
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_profiles')
          .update({ push_enabled: true })
          .eq('user_id', user.id);
      }
    }
    return success;
  }

  async disableNotifications(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_profiles')
          .update({
            push_enabled: false,
            push_token: null
          })
          .eq('user_id', user.id);
      }
    } catch (error) {
      console.error('Error disabling notifications:', error);
    }
  }
}

export const pushNotificationService = PushNotificationService.getInstance();