import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

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
  private transporter: Transporter | null = null;
  private readonly from: string;

  constructor(private config: ConfigService) {
    this.from = this.config.get<string>("SMTP_FROM", "notificaciones@medicontrol.mx");
    const host = this.config.get<string>("SMTP_HOST");
    if (host) {
      this.transporter = nodemailer.createTransport({
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

  async send(options: SendEmailOptions): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn("SMTP no configurado — email no enviado");
      return false;
    }
    try {
      const to = Array.isArray(options.to) ? options.to.join(", ") : options.to;
      await this.transporter.sendMail({
        from: this.from,
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
  ) {
    return this.send({ to, subject, text, attachments: [{ filename: pdfName, content: pdfBuffer }] });
  }

  renderTemplate(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? `{{${key}}}`);
  }
}
