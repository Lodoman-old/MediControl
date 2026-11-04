import { registerPlugin } from "@capacitor/core";

export interface RemoteFirebaseOptions {
  projectId: string;
  appId: string;
  apiKey: string;
  messagingSenderId: string;
}

interface RemoteFirebasePlugin {
  configure(options: RemoteFirebaseOptions): Promise<void>;
}

export const RemoteFirebase = registerPlugin<RemoteFirebasePlugin>("RemoteFirebase");
