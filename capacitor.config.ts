import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.keicei.exportium',
  appName: 'Exportium',
  webDir: 'dist',
  android: {
    // Release builds must never fall back to plain http or load remote content.
    allowMixedContent: false,
  },
};

export default config;
