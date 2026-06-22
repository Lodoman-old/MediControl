import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.medicontrol.app',
  appName: 'MediControl',
  webDir: 'dist',
  server: {
    allowNavigation: ['medicontrol-app.onrender.com'],
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
};

export default config;
