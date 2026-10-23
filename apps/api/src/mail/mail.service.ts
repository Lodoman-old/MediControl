import { Injectable, Logger, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { IntegrationsService } from "../settings/integrations.service";

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{ filename: string; content: Buffer }>;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly envTransporter: Transporter | null = null;
  private readonly envFrom: string;

  constructor(
    private config: ConfigService,
    @Optional() private readonly integrations?: IntegrationsService,
  ) {
    this.envFrom = this.config.get<string>("SMTP_FROM", "notificaciones@medicontrol.mx");
    const host = this.config.get<string>("SMTP_HOST");
    if (host) {
      this.envTransporter = nodemailer.createTransport({
        host,
        port: this.config.get<number>("SMTP_PORT", 587),
        secure: this.config.get<boolean>("SMTP_SECURE", false),
        auth: {
          user: this.config.get<string>("SMTP_USER", ""),
          pass: this.config.get<string>("SMTP_PASS", ""),
        },
      });
    }
  }

  async send(options: SendEmailOptions, organizationId?: string): Promise<boolean> {
    const resolved = await this.resolveTransport(organizationId);
    if (!resolved) {
      this.logger.warn("SMTP no configurado — email no enviado");
      return false;
    }

    try {
      const to = Array.isArray(options.to) ? options.to.join(", ") : options.to;
      await resolved.transporter.sendMail({
        from: resolved.from,
        to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
      });
      this.logger.log(`Email enviado a ${to}: ${options.subject}`);
      return true;
    } catch (err) {
      this.logger.error(`Error enviando email a ${options.to}`, err);
      return false;
    }
  }

  async sendReport(
    to: string[],
    subject: string,
    text: string,
    pdfBuffer: Buffer,
    pdfName: string,
    organizationId?: string,
  ) {
    return this.send(
      { to, subject, text, attachments: [{ filename: pdfName, content: pdfBuffer }] },
      organizationId,
    );
  }

  renderTemplate(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? `{{${key}}}`);
  }

  private async resolveTransport(
    organizationId?: string,
  ): Promise<{ transporter: Transporter; from: string } | null> {
    if (organizationId && this.integrations) {
      const cfg = await this.integrations.getConfig(organizationId, "SMTP");
      if (cfg?.isEnabled && cfg.config.host) {
        return {
          transporter: nodemailer.createTransport({
            host: cfg.config.host,
            port: Number(cfg.config.port ?? 587),
            secure: cfg.config.secure === "true" || cfg.config.secure === "1",
            auth: {
              user: cfg.config.user ?? "",
              pass: cfg.config.pass ?? "",
            },
          }),
          from: cfg.config.from || this.envFrom,
        };
      }
    }

    if (!this.envTransporter) return null;
    return { transporter: this.envTransporter, from: this.envFrom };
  }
}
