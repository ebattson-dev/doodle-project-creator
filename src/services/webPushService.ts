import { supabase } from "@/integrations/supabase/client";
import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA6DHaYnnhyrcG4r12X4EqDhpshE6D8LDA",
  authDomain: "thedailyrep-db1d4.firebaseapp.com",
  projectId: "thedailyrep-db1d4",
  storageBucket: "thedailyrep-db1d4.firebasestorage.app",
  messagingSenderId: "34827926020",
  appId: "1:34827926020:web:797bbee0e0a9f4ec235351",
  measurementId: "G-M0629HKEKD"
};

// FCM VAPID key
const FCM_VAPID_KEY = 'BMPqA7HlPNCUwK6PQf78EBQhvK3I38g3vJ6jXUKO7iyPc17sC6zAS9XOWUA8L9LXXIMzj132mnumI6KgdQiTyuY';

class WebPushService {
  private static instance: WebPushService;
  private registration: ServiceWorkerRegistration | null = null;
  private firebaseApp: any = null;

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

      // Initialize Firebase
      if (!this.firebaseApp) {
        this.firebaseApp = initializeApp(firebaseConfig);
        console.log('Firebase initialized');
      }

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
      console.log('Starting FCM subscription process...');
      
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

      console.log('Getting FCM token...');
      
      try {
        const messaging = getMessaging(this.firebaseApp);
        const fcmToken = await getToken(messaging, {
          vapidKey: FCM_VAPID_KEY,
          serviceWorkerRegistration: this.registration!
        });

        console.log('FCM token obtained:', fcmToken.substring(0, 20) + '...');
        console.log('Saving FCM token to database...');
        
        // Save FCM token to database
        await this.saveFCMToken(fcmToken);

        console.log('Successfully subscribed to FCM push');
        return true;
      } catch (tokenError) {
        console.error('FCM token error:', tokenError);
        if (tokenError instanceof Error) {
          console.error('Error name:', tokenError.name);
          console.error('Error message:', tokenError.message);
        }
        throw tokenError;
      }
    } catch (error) {
      console.error('Error subscribing to FCM push:', error);
      return false;
    }
  }

  async unsubscribe(): Promise<boolean> {
    try {
      await this.removeFCMToken();
      return true;
    } catch (error) {
      console.error('Error unsubscribing from FCM push:', error);
      return false;
    }
  }

  private async saveFCMToken(token: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user found');

    const { error } = await supabase
      .from('profiles')
      .update({
        push_token: token,
        push_enabled: true,
      })
      .eq('user_id', user.id);

    if (error) throw error;
  }

  private async removeFCMToken(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('profiles')
      .update({
        push_token: null,
        push_enabled: false,
      })
      .eq('user_id', user.id);
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
