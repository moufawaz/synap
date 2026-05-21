import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.synap.fit',
  appName: 'SYNAP',
  // webDir is the fallback static export dir — not used in production
  // because server.url points to the live Vercel deployment
  webDir: 'out',
  server: {
    // Start on the www subdomain directly — avoids the apex→www redirect that
    // fires before the first real page paints inside the native WebView.
    // The app layout redirects unauthenticated users to /auth/login automatically.
    url: 'https://www.synapfit.app/dashboard',
    cleartext: false,
    androidScheme: 'https',
    // Explicitly allow synapfit.app navigations to stay inside the WebView.
    // Without this, Capacitor may open external HTTPS URLs in Safari.
    allowNavigation: ['synapfit.app', '*.synapfit.app'],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
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
