import type { PaymentMethod } from "@prisma/client";

export interface ProcessPaymentParams {
  organizationId: string;
  branchId: string;
  appointmentId?: string;
  patientId: string;
  amount: number;
  currency: string;
  createdByUserId: string;
  notes?: string;
}

export interface ProcessPaymentResult {
  success: boolean;
  reference?: string;
  gatewayResponse?: Record<string, unknown>;
  message?: string;
}

export interface PaymentStrategy {
  readonly method: PaymentMethod;
  process(params: ProcessPaymentParams): Promise<ProcessPaymentResult>;
}
