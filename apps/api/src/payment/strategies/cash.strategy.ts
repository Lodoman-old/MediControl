import { Injectable } from "@nestjs/common";
import type { PaymentMethod } from "@prisma/client";
import type { PaymentStrategy, ProcessPaymentParams, ProcessPaymentResult } from "./payment-strategy.interface";

@Injectable()
export class CashStrategy implements PaymentStrategy {
  readonly method: PaymentMethod = "CASH";

  async process(params: ProcessPaymentParams): Promise<ProcessPaymentResult> {
    return {
      success: true,
      reference: `CASH-${Date.now()}`,
      gatewayResponse: { method: "cash" },
    };
  }
}
