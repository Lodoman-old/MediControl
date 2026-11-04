import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import webpush from "web-push";
import { PrismaService } from "../../prisma/prisma.service";
import { IntegrationsService } from "../../settings/integrations.service";

export interface WebPushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, string>;
}

interface WebPushServerConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrations: IntegrationsService,
    private readonly config: ConfigService,
  ) {}

  private async getServerConfig(organizationId: string): Promise<WebPushServerConfig | null> {
    const integration = await this.integrations.getConfig(organizationId, "WEB_PUSH");
    if (integration?.isEnabled) {
      const publicKey = integration.config.publicKey?.trim();
      const privateKey = integration.config.privateKey?.trim();
      const subject = integration.config.subject?.trim() || "mailto:soporte@medicontrol.mx";
      if (publicKey && privateKey) {
        return { publicKey, privateKey, subject };
      }
    }

    const publicKey = this.config.get<string>("VAPID_PUBLIC_KEY")?.trim();
    const privateKey = this.config.get<string>("VAPID_PRIVATE_KEY")?.trim();
    const subject = this.config.get<string>("VAPID_SUBJECT")?.trim() || "mailto:soporte@medicontrol.mx";
    if (publicKey && privateKey) {
      return { publicKey, privateKey, subject };
    }

    return null;
  }

  async getPublicConfig(organizationId: string): Promise<{
    enabled: boolean;
    publicKey?: string;
    subject?: string;
    reason?: string;
  }> {
    const serverConfig = await this.getServerConfig(organizationId);
    if (!serverConfig) {
      return {
        enabled: false,
        reason: "Web Push no esta configurado. Genera o carga las claves VAPID.",
      };
    }
    return {
      enabled: true,
      publicKey: serverConfig.publicKey,
      subject: serverConfig.subject,
    };
  }

  async subscribe(
    organizationId: string,
    userId: string,
    data: { endpoint: string; p256dh: string; auth: string; userAgent?: string },
  ) {
    const subscription = await this.prisma.webPushSubscription.upsert({
      where: { endpoint: data.endpoint },
      create: {
        organizationId,
        userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        userAgent: data.userAgent ?? null,
      },
      update: {
        organizationId,
        userId,
        p256dh: data.p256dh,
        auth: data.auth,
        userAgent: data.userAgent ?? null,
        isActive: true,
      },
    });

    await this.prisma.webPushSubscription.updateMany({
      where: {
        organizationId,
        userId: { not: userId },
        endpoint: data.endpoint,
      },
      data: { isActive: false },
    });

    return { id: subscription.id, active: true };
  }

  async unsubscribe(userId: string, endpoint: string) {
    await this.prisma.webPushSubscription.updateMany({
      where: { userId, endpoint },
      data: { isActive: false },
    });
    return { ok: true };
  }

  async sendToUser(
    organizationId: string,
    userId: string,
    payload: WebPushPayload,
  ): Promise<{ success: number; failed: number }> {
    const serverConfig = await this.getServerConfig(organizationId);
    if (!serverConfig) return { success: 0, failed: 0 };

    const subscriptions = await this.prisma.webPushSubscription.findMany({
      where: { organizationId, userId, isActive: true },
    });
    if (subscriptions.length === 0) return { success: 0, failed: 0 };

    const body = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url ?? "/#/notifications",
      tag: payload.tag ?? "medicontrol",
      data: payload.data ?? {},
    });

    let success = 0;
    let failed = 0;
    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            body,
            {
              TTL: 86400,
              vapidDetails: {
                subject: serverConfig.subject,
                publicKey: serverConfig.publicKey,
                privateKey: serverConfig.privateKey,
              },
            },
          );
          success++;
        } catch (err) {
          failed++;
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await this.prisma.webPushSubscription.update({
              where: { id: subscription.id },
              data: { isActive: false },
            });
          } else {
            this.logger.warn(
              `Web Push fallo para suscripcion ${subscription.id}: ${(err as Error).message}`,
            );
          }
        }
      }),
    );

    return { success, failed };
  }
}
