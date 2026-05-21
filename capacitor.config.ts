import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.synap.fit',
  appName: 'SYNAP',
  // webDir is the fallback static export dir — not used in production
  // because server.url points to the live Vercel deployment
  webDir: 'out',
  server: {
    // Load the live Vercel app inside the native WebView.
    // All Next.js API routes, Supabase auth, and streaming work as normal.
    url: 'https://synapfit.app',
    cleartext: false,
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: '#0A0A0F',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      spinnerColor: '#BB5CF6',
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#0A0A0F',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
}

export default config
