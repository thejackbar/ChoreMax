import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bltbox.choremax',
  appName: 'ChoreMax',
  webDir: 'dist',
  server: {
    // Allow mixed content for development; production uses HTTPS throughout
    androidScheme: 'https',
    iosScheme: 'capacitor',
  },
  plugins: {
    CapacitorHttp: {
      // Route fetch() through native iOS networking, bypassing CORS restrictions
      enabled: true,
    },
    App: {
      // Custom URL scheme for Google OAuth callback deep link
      // Handled by App.addListener('appUrlOpen', ...)
    },
  },
  ios: {
    // Custom URL scheme registered in Info.plist for OAuth return
    scheme: 'choremax',
  },
};

export default config;
