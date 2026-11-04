import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  initializeApp,
  cert,
  deleteApp,
  getApp,
  getApps,
  type App,
} from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { IntegrationsService } from "../../settings/integrations.service";

interface FirebaseCredentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private envReady = false;
  private readonly orgApps = new Map<string, { app: App; fingerprint: string }>();

  constructor(
    private readonly config: ConfigService,
    private readonly integrations: IntegrationsService,
  ) {}

  onModuleInit() {
    const env = this.readEnvCredentials();
    if (env) {
      try {
        if (!getApps().some((app) => app.name === "[DEFAULT]")) {
          initializeApp({ credential: cert(this.toCert(env)) });
        }
        this.envReady = true;
        this.logger.log("Firebase Admin SDK initialized from environment");
      } catch (err) {
        this.logger.error("Failed to initialize Firebase Admin SDK from environment", err);
      }
    } else {
      this.logger.warn(
        "Firebase env credentials not configured; se usara la configuracion FIREBASE guardada por organizacion",
      );
    }
  }

  private readEnvCredentials(): FirebaseCredentials | null {
    const projectId = this.config.get<string>("FIREBASE_PROJECT_ID");
    const clientEmail = this.config.get<string>("FIREBASE_CLIENT_EMAIL");
    const privateKey = this.config.get<string>("FIREBASE_PRIVATE_KEY");
    if (!projectId || !clientEmail || !privateKey) return null;
    return { projectId, clientEmail, privateKey };
  }

  private toCert(credentials: FirebaseCredentials) {
    return {
      projectId: credentials.projectId,
      clientEmail: credentials.clientEmail,
      privateKey: credentials.privateKey.replace(/\\n/g, "\n"),
    };
  }

  private credentialsFromConfig(config: Record<string, string>): FirebaseCredentials | null {
    const projectId = config.projectId?.trim();
    const clientEmail = config.clientEmail?.trim();
    const privateKey = config.privateKey?.trim();
    if (!projectId || !clientEmail || !privateKey) return null;
    return { projectId, clientEmail, privateKey };
  }

  private async resolveApp(organizationId?: string): Promise<App | null> {
    if (organizationId) {
      const config = await this.integrations.getConfig(organizationId, "FIREBASE");
      if (config?.isEnabled) {
        const credentials = this.credentialsFromConfig(config.config);
        if (credentials) {
          const fingerprint = `${credentials.projectId}|${credentials.clientEmail}|${credentials.privateKey}`;
          const cached = this.orgApps.get(organizationId);
          if (cached?.fingerprint === fingerprint) return cached.app;

          try {
            const existing = getApps().find((app) => app.name === `org-${organizationId}`);
            if (existing) await deleteApp(existing);
            const app = initializeApp(
              { credential: cert(this.toCert(credentials)) },
              `org-${organizationId}`,
            );
            this.orgApps.set(organizationId, { app, fingerprint });
            this.logger.log(`Firebase Admin SDK initialized for organization ${organizationId}`);
            return app;
          } catch (err) {
            this.logger.error(
              `Failed to initialize Firebase for organization ${organizationId}`,
              err,
            );
          }
        }
      }
    }

    if (this.envReady) {
      try {
        return getApp();
      } catch {
        return null;
      }
    }
    return null;
  }

  async sendToDevice(
    token: string,
    payload: { title: string; body: string; data?: Record<string, string> },
    organizationId?: string,
  ): Promise<boolean> {
    const app = await this.resolveApp(organizationId);
    if (!app) return false;
    try {
      await getMessaging(app).send({
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

  async sendToMultipleDevices(
    tokens: string[],
    payload: { title: string; body: string; data?: Record<string, string> },
    organizationId?: string,
  ): Promise<{ success: number; failed: number }> {
    if (tokens.length === 0) return { success: 0, failed: 0 };
    const app = await this.resolveApp(organizationId);
    if (!app) return { success: 0, failed: 0 };

    const messaging = getMessaging(app);
    const results = await Promise.allSettled(
      tokens.map((token) =>
        messaging.send({
          token,
          notification: { title: payload.title, body: payload.body },
          data: payload.data,
          android: { priority: "high", ttl: 86400 },
        }),
      ),
    );
    const success = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - success;
    if (failed > 0) {
      this.logger.warn(
        `Push: ${success} enviados, ${failed} fallidos de ${tokens.length} dispositivo(s)`,
      );
    }
    return { success, failed };
  }
}
