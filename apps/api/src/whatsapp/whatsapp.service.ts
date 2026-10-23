import { Injectable, Logger, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IntegrationsService } from "../settings/integrations.service";

interface WhatsappCredentials {
  apiToken: string;
  phoneNumberId: string;
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly envApiToken: string | null;
  private readonly envPhoneNumberId: string | null;
  private readonly baseUrl: string;

  constructor(
    private config: ConfigService,
    @Optional() private readonly integrations?: IntegrationsService,
  ) {
    this.envApiToken = this.config.get<string>("WHATSAPP_API_TOKEN") ?? null;
    this.envPhoneNumberId = this.config.get<string>("WHATSAPP_PHONE_NUMBER_ID") ?? null;
    this.baseUrl = "https://graph.facebook.com/v21.0";
  }

  async sendTextMessage(to: string, text: string, organizationId?: string): Promise<boolean> {
    const credentials = await this.resolveCredentials(organizationId);
    if (!credentials) {
      this.logger.warn("WhatsApp no configurado — mensaje no enviado");
      return false;
    }
    try {
      const url = `${this.baseUrl}/${credentials.phoneNumberId}/messages`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credentials.apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: text },
        }),
      });
      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(`WhatsApp API error: ${response.status} ${errorBody}`);
        return false;
      }
      this.logger.log(`WhatsApp enviado a ${to}`);
      return true;
    } catch (err) {
      this.logger.error(`Error enviando WhatsApp a ${to}`, err);
      return false;
    }
  }

  async sendTemplateMessage(
    to: string,
    templateName: string,
    parameters: string[],
    organizationId?: string,
  ): Promise<boolean> {
    const credentials = await this.resolveCredentials(organizationId);
    if (!credentials) {
      this.logger.warn("WhatsApp no configurado — template no enviado");
      return false;
    }
    try {
      const url = `${this.baseUrl}/${credentials.phoneNumberId}/messages`;
      const components = [
        {
          type: "body",
          parameters: parameters.map((p) => ({ type: "text", text: p })),
        },
      ];
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credentials.apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: { name: templateName, language: { code: "es_MX" }, components },
        }),
      });
      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(`WhatsApp template error: ${response.status} ${errorBody}`);
        return false;
      }
      this.logger.log(`WhatsApp template "${templateName}" enviado a ${to}`);
      return true;
    } catch (err) {
      this.logger.error(`Error enviando template WhatsApp a ${to}`, err);
      return false;
    }
  }

  private async resolveCredentials(
    organizationId?: string,
  ): Promise<WhatsappCredentials | null> {
    if (organizationId && this.integrations) {
      const cfg = await this.integrations.getConfig(organizationId, "WHATSAPP");
      if (cfg?.isEnabled && cfg.config.apiToken && cfg.config.phoneNumberId) {
        return {
          apiToken: cfg.config.apiToken,
          phoneNumberId: cfg.config.phoneNumberId,
        };
      }
    }

    if (!this.envApiToken || !this.envPhoneNumberId) return null;
    return { apiToken: this.envApiToken, phoneNumberId: this.envPhoneNumberId };
  }
}
