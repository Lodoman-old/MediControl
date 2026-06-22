import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.medicontrol.app',
  appName: 'MediControl',
  webDir: 'dist',
  server: {
    hostname: 'medicontrol-app.onrender.com',
    androidScheme: 'https',
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
};

export default config;
