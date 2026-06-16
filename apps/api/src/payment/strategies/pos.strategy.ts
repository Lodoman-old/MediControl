import { Injectable } from "@nestjs/common";
import type { PaymentMethod } from "@prisma/client";
import type { PaymentStrategy, ProcessPaymentParams, ProcessPaymentResult } from "./payment-strategy.interface";

@Injectable()
export class PosStrategy implements PaymentStrategy {
  readonly method: PaymentMethod = "POS";

  async process(params: ProcessPaymentParams): Promise<ProcessPaymentResult> {
    return {
      success: true,
      reference: `POS-${Date.now()}`,
      gatewayResponse: { method: "pos", terminalId: "TERM-001" },
    };
  }
}
