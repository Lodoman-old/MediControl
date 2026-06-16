import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly apiToken: string | null;
  private readonly phoneNumberId: string | null;
  private readonly baseUrl: string;

  constructor(private config: ConfigService) {
    this.apiToken = this.config.get<string>("WHATSAPP_API_TOKEN") ?? null;
    this.phoneNumberId = this.config.get<string>("WHATSAPP_PHONE_NUMBER_ID") ?? null;
    this.baseUrl = "https://graph.facebook.com/v21.0";
  }

  async sendTextMessage(to: string, text: string): Promise<boolean> {
    if (!this.apiToken || !this.phoneNumberId) {
      this.logger.warn("WhatsApp no configurado — mensaje no enviado");
      return false;
    }
    try {
      const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
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
  ): Promise<boolean> {
    if (!this.apiToken || !this.phoneNumberId) {
      this.logger.warn("WhatsApp no configurado — template no enviado");
      return false;
    }
    try {
      const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;
      const components = [
        {
          type: "body",
          parameters: parameters.map((p) => ({ type: "text", text: p })),
        },
      ];
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
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
}
