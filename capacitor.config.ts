import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.d1dcdcd94af84412b31ad03209747079',
  appName: 'Daily Rep',
  webDir: 'dist',
  server: {
    url: 'https://d1dcdcd9-4af8-4412-b31a-d03209747079.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;