import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { CashStrategy } from "./strategies/cash.strategy";
import { PosStrategy } from "./strategies/pos.strategy";
import { SpeiStrategy } from "./strategies/spei.strategy";
import { MercadoPagoStrategy } from "./strategies/mercadopago.strategy";
import type { PaymentStrategy, ProcessPaymentParams } from "./payment.types";
import type { CreatePaymentDto, PaymentFilterDto, UpdatePaymentStatusDto } from "./dto/payment.dto";
import type { PaymentMethod, PaymentStatus } from "@prisma/client";

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly strategies: Map<PaymentMethod, PaymentStrategy>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly cashStrategy: CashStrategy,
    private readonly posStrategy: PosStrategy,
    private readonly speiStrategy: SpeiStrategy,
    private readonly mercadopagoStrategy: MercadoPagoStrategy,
  ) {
    this.strategies = new Map();
    for (const s of [cashStrategy, posStrategy, speiStrategy, mercadopagoStrategy]) {
      this.strategies.set(s.method, s);
    }
  }

  async create(organizationId: string, userId: string, dto: CreatePaymentDto) {
    const strategy = this.strategies.get(dto.method);
    if (!strategy) throw new BadRequestException(`Método de pago no soportado: ${dto.method}`);

    const params: ProcessPaymentParams = {
      organizationId,
      branchId: dto.branchId,
      appointmentId: dto.appointmentId,
      patientId: dto.patientId,
      amount: dto.amount,
      currency: dto.currency ?? "MXN",
      createdByUserId: userId,
      notes: dto.notes,
    };

    const result = await strategy.process(params);
    if (!result.success) throw new BadRequestException(result.message ?? "Error al procesar pago");

    const payment = await this.prisma.payment.create({
      data: {
        organizationId,
        branchId: dto.branchId,
        appointmentId: dto.appointmentId,
        patientId: dto.patientId,
        amount: dto.amount,
        currency: dto.currency ?? "MXN",
        method: dto.method,
        status: "COMPLETED",
        reference: result.reference,
        gatewayResponse: result.gatewayResponse as any,
        paidAt: new Date(),
        createdByUserId: userId,
        notes: dto.notes,
      },
    });

    if (dto.appointmentId) {
      await this.prisma.appointment.update({
        where: { id: dto.appointmentId },
        data: { status: "PAID" },
      });
    }

    return payment;
  }

  async findAll(organizationId: string, filters?: PaymentFilterDto) {
    const where: any = { organizationId };
    if (filters?.patientId) where.patientId = filters.patientId;
    if (filters?.appointmentId) where.appointmentId = filters.appointmentId;
    if (filters?.status) where.status = filters.status;
    if (filters?.method) where.method = filters.method;

    return this.prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { patient: { include: { person: true } } },
    });
  }

  async findOne(organizationId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, organizationId },
      include: { patient: { include: { person: true } } },
    });
    if (!payment) throw new NotFoundException("Pago no encontrado");
    return payment;
  }

  async updateStatus(organizationId: string, id: string, dto: UpdatePaymentStatusDto) {
    const payment = await this.prisma.payment.findFirst({ where: { id, organizationId } });
    if (!payment) throw new NotFoundException("Pago no encontrado");

    return this.prisma.payment.update({
      where: { id },
      data: {
        status: dto.status as PaymentStatus,
        reference: dto.reference ?? payment.reference,
        paidAt: dto.status === "COMPLETED" && !payment.paidAt ? new Date() : payment.paidAt,
      },
    });
  }

  async getDailySummary(organizationId: string, date?: string) {
    const day = date ? new Date(date) : new Date();
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(day);
    end.setHours(23, 59, 59, 999);

    const payments = await this.prisma.payment.findMany({
      where: {
        organizationId,
        createdAt: { gte: start, lte: end },
        status: "COMPLETED",
      },
    });

    const total = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const byMethod: Record<string, number> = {};
    for (const p of payments) {
      byMethod[p.method] = (byMethod[p.method] ?? 0) + Number(p.amount);
    }

    return { total, count: payments.length, byMethod };
  }

  async handleMercadoPagoWebhook(body: Record<string, unknown>) {
    this.logger.log(`Webhook MP recibido: ${JSON.stringify(body)}`);
    const data = body as any;
    if (data?.type === "payment" && data?.data?.id) {
      const paymentId = data.data.id;
      try {
        const { MercadoPagoConfig, Payment: MPPayment } = await import("mercadopago");
        const token = this.config.get<string>("MERCADOPAGO_ACCESS_TOKEN");
        if (!token) return { received: true };
        const client = new MercadoPagoConfig({ accessToken: token });
        const mpPayment = await new MPPayment(client).get({ id: paymentId });
        if (mpPayment.status === "approved" && mpPayment.external_reference) {
          const existing = await this.prisma.payment.findFirst({ where: { reference: mpPayment.external_reference } });
          if (existing) {
            await this.prisma.payment.update({
              where: { id: existing.id },
              data: { status: "COMPLETED", paidAt: new Date(), gatewayResponse: mpPayment as any },
            });
          }
        }
      } catch (err) {
        this.logger.error("Error procesando webhook MP", err);
      }
    }
    return { received: true };
  }
}
