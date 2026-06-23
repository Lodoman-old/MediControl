import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private initialized = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const projectId = this.config.get<string>("FIREBASE_PROJECT_ID");
    const clientEmail = this.config.get<string>("FIREBASE_CLIENT_EMAIL");
    const privateKey = this.config.get<string>("FIREBASE_PRIVATE_KEY");

    if (projectId && clientEmail && privateKey) {
      try {
        if (getApps().length === 0) {
          initializeApp({
            credential: cert({
              projectId,
              clientEmail,
              privateKey: privateKey.replace(/\\n/g, "\n"),
            }),
          });
        }
        this.initialized = true;
        this.logger.log("Firebase Admin SDK initialized");
      } catch (err) {
        this.logger.error("Failed to initialize Firebase Admin SDK", err);
      }
    } else {
      this.logger.warn("Firebase credentials not configured — push notifications disabled");
    }
  }

  async sendToDevice(token: string, payload: { title: string; body: string; data?: Record<string, string> }): Promise<boolean> {
    if (!this.initialized) return false;
    try {
      await getMessaging().send({
        token,
        notification: { title: payload.title, body: payload.body },
        data: payload.data,
        android: { priority: "high", ttl: 86400 },
      });
      return true;
    } catch (err) {
      this.logger.error(`Push send failed to token: ${token.slice(0, 20)}...`, err);
      return false;
    }
  }

  async sendToMultipleDevices(tokens: string[], payload: { title: string; body: string; data?: Record<string, string> }): Promise<{ success: number; failed: number }> {
    if (!this.initialized || tokens.length === 0) return { success: 0, failed: 0 };

    const results = await Promise.allSettled(
      tokens.map((token) => this.sendToDevice(token, payload)),
    );
    const success = results.filter((r) => r.status === "fulfilled" && r.value).length;
    const failed = results.filter((r) => r.status === "rejected" || !r.value).length;
    return { success, failed };
  }
}
