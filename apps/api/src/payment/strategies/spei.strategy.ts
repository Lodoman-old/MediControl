import { Injectable } from "@nestjs/common";
import type { PaymentMethod } from "@prisma/client";
import type { PaymentStrategy, ProcessPaymentParams, ProcessPaymentResult } from "./payment-strategy.interface";

@Injectable()
export class SpeiStrategy implements PaymentStrategy {
  readonly method: PaymentMethod = "SPEI";

  async process(params: ProcessPaymentParams): Promise<ProcessPaymentResult> {
    return {
      success: true,
      reference: `SPEI-${Date.now()}`,
      gatewayResponse: { method: "spei", clabe: "012180015798543414" },
    };
  }
}
