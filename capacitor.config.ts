import type { CapacitorConfig } from '@capacitor/cli';

// Native shell for geekfon.ai. The web app is Next.js with SSR + API routes,
// so instead of a static export, the native app loads the live production
// site directly (server.url below). mobile/www is only a placeholder asset
// dir Capacitor requires to exist; it is never actually shown to users.
// Native-only functionality (RevenueCat purchases) is handled by
// lib/revenuecat.ts, which no-ops on web via Capacitor.isNativePlatform().
const config: CapacitorConfig = {
  // Locked by Sean 2026-07-10. Do not change without a new App Store
  // Connect / Play Console app listing - this is permanent once published.
  appId: 'com.lesaruss.geekfon',
  appName: 'GeekFon Society',
  webDir: 'mobile/www',
  server: {
    url: 'https://geekfon.ai',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
