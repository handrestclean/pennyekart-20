import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pennyekart.app",
  appName: "Pennyekart",
  webDir: "dist",

  // The app loads the LIVE website, so every site update appears in the
  // app instantly without publishing a new APK/AAB.
  server: {
    url: "https://www.pennyekart.com",
    errorPath: "offline.html",
    cleartext: false,
  },

  // --- Development hot-reload ---------------------------------------------
  // While developing, comment the production url above and use the sandbox
  // preview URL instead, then run `npx cap sync`:
  //   url: "https://5b3cdc48-67ea-449a-a3d4-2aa99c183c55.lovableproject.com?forceHideBadge=true",
  // -------------------------------------------------------------------------

  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#1a120b",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
