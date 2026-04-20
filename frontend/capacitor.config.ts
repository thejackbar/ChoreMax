import type { CapacitorConfig } from '@capacitor/cli';

// Extended type: CapacitorConfig doesn't declare packageClassList in its typings
// but Capacitor iOS reads it from the generated capacitor.config.json to know
// which plugin classes from the CapApp-SPM package to register with the bridge.
type ChoreMaxCapacitorConfig = CapacitorConfig & { packageClassList: string[] }

const config: ChoreMaxCapacitorConfig = {
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
  // Registers plugin classes from CapApp-SPM with the Capacitor bridge.
  // cap sync ios regenerates capacitor.config.json from this file, so this
  // list must live here — not just in ios/App/App/capacitor.config.json.
  packageClassList: [
    'AppPlugin',
    'PreferencesPlugin',
    'RemindersPlugin',
  ],
};

export default config;
