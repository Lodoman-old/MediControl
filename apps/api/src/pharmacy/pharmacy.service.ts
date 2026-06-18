import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateMedicationDto, UpdateMedicationDto, CreateBatchDto, CreateStockMovementDto, CreateSaleDto, CreateDispensingDto } from "./dto/pharmacy.dto";

@Injectable()
export class PharmacyService {
  private readonly logger = new Logger(PharmacyService.name);
  constructor(private readonly prisma: PrismaService) {}

  // --- MEDICATIONS ---

  async createMedication(organizationId: string, dto: CreateMedicationDto) {
    return this.prisma.medication.create({
      data: { organizationId, ...dto, price: dto.price },
    });
  }

  async listMedications(organizationId: string, activeOnly = false) {
    const where: any = { organizationId };
    if (activeOnly) where.isActive = true;
    return this.prisma.medication.findMany({ where, orderBy: { name: "asc" } });
  }

  async getMedication(organizationId: string, id: string) {
    const m = await this.prisma.medication.findFirst({ where: { id, organizationId } });
    if (!m) throw new NotFoundException("Medicamento no encontrado");
    return m;
  }

  async updateMedication(organizationId: string, id: string, dto: UpdateMedicationDto) {
    await this.getMedication(organizationId, id);
    return this.prisma.medication.update({ where: { id }, data: dto as any });
  }

  // --- INVENTORY BATCHES ---

  async createBatch(organizationId: string, dto: CreateBatchDto, userId = "system") {
    const med = await this.prisma.medication.findFirst({ where: { id: dto.medicationId, organizationId } });
    if (!med) throw new NotFoundException("Medicamento no encontrado");

    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.inventoryBatch.create({
        data: {
          organizationId,
          medicationId: dto.medicationId,
          batchNumber: dto.batchNumber,
          expiryDate: new Date(dto.expiryDate),
          initialStock: dto.initialStock,
          currentStock: dto.initialStock,
          costPrice: dto.costPrice ?? null,
        },
      });
      await tx.stockMovement.create({
        data: {
          organizationId,
          batchId: batch.id,
          type: "IN",
          quantity: dto.initialStock,
          previousStock: 0,
          newStock: dto.initialStock,
          createdByUserId: userId,
        },
      });
      return batch;
    });
  }

  async listBatches(organizationId: string, medicationId?: string, branchId?: string) {
    const where: any = { organizationId };
    if (medicationId) where.medicationId = medicationId;
    if (branchId) where.branchId = branchId;
    return this.prisma.inventoryBatch.findMany({
      where,
      include: { medication: true, branch: { select: { id: true, name: true, code: true } } },
      orderBy: { expiryDate: "asc" },
    });
  }

  async listMovements(organizationId: string, batchId?: string) {
    const where: any = { organizationId };
    if (batchId) where.batchId = batchId;
    return this.prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async adjustStock(organizationId: string, dto: CreateStockMovementDto, userId = "system") {
    const batch = await this.prisma.inventoryBatch.findFirst({ where: { id: dto.batchId, organizationId } });
    if (!batch) throw new NotFoundException("Lote no encontrado");

    return this.prisma.$transaction(async (tx) => {
      let newStock = batch.currentStock;
      if (dto.type === "IN") newStock += dto.quantity;
      else if (dto.type === "OUT") {
        if (batch.currentStock < dto.quantity) throw new BadRequestException("Stock insuficiente");
        newStock -= dto.quantity;
      } else {
        newStock = dto.quantity;
      }

      await tx.inventoryBatch.update({
        where: { id: batch.id },
        data: { currentStock: newStock },
      });

      return tx.stockMovement.create({
        data: {
          organizationId,
          batchId: batch.id,
          type: dto.type,
          quantity: dto.quantity,
          previousStock: batch.currentStock,
          newStock,
          reason: dto.reason,
          referenceId: dto.referenceId,
          createdByUserId: userId,
        },
      });
    });
  }

  // --- POS (SALES) ---

  async createSale(organizationId: string, userId: string, roles: string[], userBranchId: string | null, dto: CreateSaleDto) {
    const isAdmin = roles.some((r) => ["SUPERADMIN", "ADMIN"].includes(r));
    const rawItems = (dto.items ?? []) as Array<Record<string, unknown>>;
    return this.prisma.$transaction(async (tx) => {
      const items: Array<{
        medicationId: string; batchId?: string; quantity: number; unitPrice: number;
        totalPrice: number; dispensingId?: string;
      }> = [];
      const prescriptionDispensings = new Map<string, string>();
      let subtotal = 0;

      for (const raw of rawItems) {
        const medicationId = String(raw.medicationId ?? "");
        const batchId = raw.batchId ? String(raw.batchId) : undefined;
        const quantity = Number(raw.quantity ?? 0);
        const unitPrice = Number(raw.unitPrice ?? 0);
        const prescriptionId = raw.prescriptionId ? String(raw.prescriptionId) : undefined;

        const med = await tx.medication.findFirst({ where: { id: medicationId, organizationId } });
        if (!med) throw new NotFoundException(`Medicamento ${medicationId} no encontrado`);

        if (batchId) {
          const batch = await tx.inventoryBatch.findFirst({ where: { id: batchId, organizationId } });
          if (!batch) throw new NotFoundException(`Lote ${batchId} no encontrado`);
          // Non-admin users can only sell from their own branch's inventory
          if (!isAdmin && batch.branchId && userBranchId && batch.branchId !== userBranchId) {
            throw new ForbiddenException("No puedes vender inventario de otra sucursal");
          }
          if (batch.currentStock < quantity) throw new BadRequestException(`Stock insuficiente para lote ${batch.batchNumber}`);

          await tx.inventoryBatch.update({
            where: { id: batch.id },
            data: { currentStock: batch.currentStock - quantity },
          });
          await tx.stockMovement.create({
            data: {
              organizationId, batchId: batch.id, type: "OUT",
              quantity,
              previousStock: batch.currentStock,
              newStock: batch.currentStock - quantity,
              referenceId: "SALE",
              createdByUserId: userId,
            },
          });
        }

        let dispensingId: string | undefined;
        if (prescriptionId) {
          const prescription = await tx.prescription.findFirst({ where: { id: prescriptionId, organizationId } });
          if (!prescription) throw new NotFoundException("Receta no encontrada");
          if (["DISPENSED", "COMPLETED", "CANCELLED", "EXPIRED"].includes(prescription.status)) {
            throw new BadRequestException(`Receta en estado ${prescription.status} no puede despacharse`);
          }

          const dispensing = await tx.dispensing.create({
            data: {
              organizationId, prescriptionId, medicationId,
              batchId: batchId!, quantity,
              dispensedByUserId: userId,
            },
          });
          dispensingId = dispensing.id;
          prescriptionDispensings.set(prescriptionId, dispensing.id);
        }

        const totalPrice = quantity * unitPrice;
        subtotal += totalPrice;
        items.push({ medicationId, batchId, quantity, unitPrice, totalPrice, dispensingId });
      }

      const tax = Math.round(subtotal * 0.16 * 100) / 100;
      const total = subtotal + tax;

      const sale = await tx.sale.create({
        data: {
          organizationId,
          branchId: dto.branchId,
          patientId: dto.patientId,
          subtotal, tax, total,
          method: dto.method,
          paymentReference: dto.paymentReference,
          notes: dto.notes,
          createdByUserId: userId,
          items: { create: items },
        },
        include: { items: { include: { medication: true } } },
      });

      for (const [prescriptionId] of prescriptionDispensings) {
        const totalDispensed = await tx.dispensing.aggregate({
          where: { prescriptionId },
          _sum: { quantity: true },
        });
        const prescription = await tx.prescription.findUnique({ where: { id: prescriptionId } });
        if (prescription) {
          const newStatus = (totalDispensed._sum.quantity ?? 0) >= (prescription.quantity ?? 0) ? "DISPENSED" as const : "PARTIALLY_DISPENSED" as const;
          await tx.prescription.update({ where: { id: prescriptionId }, data: { status: newStatus } });
        }
      }

      return sale;
    });
  }

  async listSales(organizationId: string, userId?: string) {
    const where: any = { organizationId };
    if (userId) where.createdByUserId = userId;
    return this.prisma.sale.findMany({
      where,
      include: {
        items: { include: { medication: true } },
        patient: { include: { person: true } },
        createdBy: { select: { id: true, email: true, person: { select: { firstName: true, lastNameP: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async getSale(organizationId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, organizationId },
      include: { items: { include: { medication: true, batch: true, dispensing: { include: { prescription: true } } } }, patient: { include: { person: true } } },
    });
    if (!sale) throw new NotFoundException("Venta no encontrada");
    return sale;
  }

  async getDailySalesSummary(organizationId: string, date?: string) {
    const day = date ? new Date(date) : new Date();
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(day);
    end.setHours(23, 59, 59, 999);

    const sales = await this.prisma.sale.findMany({
      where: { organizationId, createdAt: { gte: start, lte: end }, status: "COMPLETED" },
    });

    const total = sales.reduce((s, sale) => s + Number(sale.total), 0);
    const byMethod: Record<string, number> = {};
    for (const s of sales) {
      byMethod[s.method] = (byMethod[s.method] ?? 0) + Number(s.total);
    }
    return { total, count: sales.length, byMethod };
  }

  // --- DISPENSING ---

  async dispenseFromPrescription(organizationId: string, userId: string, dto: CreateDispensingDto) {
    const prescription = await this.prisma.prescription.findFirst({ where: { id: dto.prescriptionId, organizationId } });
    if (!prescription) throw new NotFoundException("Receta no encontrada");
    if (prescription.status === "DISPENSED" || prescription.status === "COMPLETED" || prescription.status === "CANCELLED" || prescription.status === "EXPIRED") {
      throw new BadRequestException(`Receta en estado ${prescription.status} no puede despacharse`);
    }

    const batch = await this.prisma.inventoryBatch.findFirst({ where: { id: dto.batchId, organizationId } });
    if (!batch) throw new NotFoundException("Lote no encontrado");
    if (batch.currentStock < dto.quantity) throw new BadRequestException("Stock insuficiente");

    return this.prisma.$transaction(async (tx) => {
      // Deduct stock
      await tx.inventoryBatch.update({ where: { id: batch.id }, data: { currentStock: batch.currentStock - dto.quantity } });
      await tx.stockMovement.create({
        data: {
          organizationId, batchId: batch.id, type: "OUT",
          quantity: dto.quantity, previousStock: batch.currentStock, newStock: batch.currentStock - dto.quantity,
          referenceId: `RX-${dto.prescriptionId}`, createdByUserId: userId,
        },
      });

      // Create dispensing
      const dispensing = await tx.dispensing.create({
        data: {
          organizationId, prescriptionId: dto.prescriptionId, medicationId: dto.medicationId,
          batchId: dto.batchId, quantity: dto.quantity, instructions: dto.instructions, dispensedByUserId: userId,
        },
      });

      // Update prescription status
      const totalDispensed = await tx.dispensing.aggregate({
        where: { prescriptionId: dto.prescriptionId },
        _sum: { quantity: true },
      });
      const newStatus = (totalDispensed._sum.quantity ?? 0) >= (prescription.quantity ?? 0) ? "DISPENSED" : "PARTIALLY_DISPENSED";
      await tx.prescription.update({ where: { id: dto.prescriptionId }, data: { status: newStatus as any } });

      return dispensing;
    });
  }

  async listDispensings(organizationId: string, prescriptionId?: string) {
    const where: any = { organizationId };
    if (prescriptionId) where.prescriptionId = prescriptionId;
    return this.prisma.dispensing.findMany({
      where,
      include: { medication: true, batch: true, prescription: true },
      orderBy: { createdAt: "desc" },
    });
  }
}
