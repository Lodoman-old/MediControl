import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MercadoPagoConfig, Preference, Payment as MPPayment } from "mercadopago";
import type { PaymentMethod } from "@prisma/client";
import type { PaymentStrategy, ProcessPaymentParams, ProcessPaymentResult } from "./payment-strategy.interface";

@Injectable()
export class MercadoPagoStrategy implements PaymentStrategy {
  private readonly logger = new Logger(MercadoPagoStrategy.name);
  readonly method: PaymentMethod = "MERCADO_PAGO";
  private client: MercadoPagoConfig | null = null;
  private preference: Preference | null = null;

  constructor(private readonly config: ConfigService) {
    const token = this.config.get<string>("MERCADOPAGO_ACCESS_TOKEN");
    if (token) {
      this.client = new MercadoPagoConfig({ accessToken: token, options: { timeout: 10000 } });
      this.preference = new Preference(this.client);
    }
  }

  async process(params: ProcessPaymentParams): Promise<ProcessPaymentResult> {
    const enabled = this.config.get<string>("FEATURE_MERCADOPAGO_ENABLED", "false") === "true";
    if (!enabled) {
      return { success: false, message: "Mercado Pago no está habilitado" };
    }

    if (!this.client || !this.preference) {
      return { success: false, message: "Mercado Pago no configurado (falta MERCADOPAGO_ACCESS_TOKEN)" };
    }

    try {
      const result = await this.preference.create({
        body: {
          items: [{ id: `appt-${params.appointmentId?.slice(0, 8) ?? "00"}`, title: `Pago MediControl #${params.appointmentId?.slice(0, 8) ?? ""}`, unit_price: params.amount, quantity: 1, currency_id: params.currency ?? "MXN" }],
          metadata: { organizationId: params.organizationId, appointmentId: params.appointmentId, patientId: params.patientId },
          back_urls: { success: `${this.config.get<string>("APP_URL", "http://localhost:5173")}/pagos`, failure: `${this.config.get<string>("APP_URL", "http://localhost:5173")}/pagos`, pending: `${this.config.get<string>("APP_URL", "http://localhost:5173")}/pagos` },
          auto_return: "approved",
          notification_url: `${this.config.get<string>("API_URL", "http://localhost:3000")}/payments/mercadopago/webhook`,
        },
      });

      return {
        success: true,
        reference: result.id!,
        gatewayResponse: { initPoint: result.init_point, sandboxInitPoint: result.sandbox_init_point, preferenceId: result.id },
      };
    } catch (err: any) {
      this.logger.error("Error creando preferencia MP", err.message);
      return { success: false, message: `Error al crear pago en Mercado Pago: ${err.message}` };
    }
  }
}
