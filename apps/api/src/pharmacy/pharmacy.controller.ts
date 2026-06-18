import { Controller, Get, Post, Patch, Body, Param, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { PharmacyService } from "./pharmacy.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { CreateMedicationDto, UpdateMedicationDto, CreateBatchDto, CreateStockMovementDto, CreateSaleDto, CreateDispensingDto } from "./dto/pharmacy.dto";

@ApiTags("Farmacia")
@ApiBearerAuth()
@Controller("pharmacy")
export class PharmacyController {
  constructor(private readonly pharm: PharmacyService) {}

  // --- MEDICATIONS ---
  @Roles("SUPERADMIN", "ADMIN")
  @Post("medications")
  async createMedication(@CurrentUser() u: AuthenticatedUser, @Body() dto: CreateMedicationDto) {
    return this.pharm.createMedication(u.organizationId, dto);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "CAJERO")
  @Get("medications")
  async listMedications(@CurrentUser() u: AuthenticatedUser, @Query("active") active?: string) {
    return this.pharm.listMedications(u.organizationId, active === "true");
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "CAJERO")
  @Get("medications/:id")
  async getMedication(@CurrentUser() u: AuthenticatedUser, @Param("id") id: string) {
    return this.pharm.getMedication(u.organizationId, id);
  }

  @Roles("SUPERADMIN", "ADMIN")
  @Patch("medications/:id")
  async updateMedication(@CurrentUser() u: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateMedicationDto) {
    return this.pharm.updateMedication(u.organizationId, id, dto);
  }

  // --- INVENTORY ---
  @Roles("SUPERADMIN", "ADMIN")
  @Post("batches")
  async createBatch(@CurrentUser() u: AuthenticatedUser, @Body() dto: CreateBatchDto) {
    return this.pharm.createBatch(u.organizationId, dto, u.userId);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "CAJERO")
  @Get("batches")
  async listBatches(@CurrentUser() u: AuthenticatedUser, @Query("medicationId") medicationId?: string, @Query("branchId") branchId?: string) {
    return this.pharm.listBatches(u.organizationId, medicationId, branchId);
  }

  @Roles("SUPERADMIN", "ADMIN")
  @Post("movements")
  async adjustStock(@CurrentUser() u: AuthenticatedUser, @Body() dto: CreateStockMovementDto) {
    return this.pharm.adjustStock(u.organizationId, dto, u.userId);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "CAJERO")
  @Get("movements")
  async listMovements(@CurrentUser() u: AuthenticatedUser, @Query("batchId") batchId?: string) {
    return this.pharm.listMovements(u.organizationId, batchId);
  }

  // --- POS ---
  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "CAJERO")
  @Post("sales")
  async createSale(@CurrentUser() u: AuthenticatedUser, @Body() dto: CreateSaleDto) {
    return this.pharm.createSale(u.organizationId, u.userId, u.roles, u.branchId, dto);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "CAJERO")
  @Get("sales")
  async listSales(@CurrentUser() u: AuthenticatedUser, @Query("userId") userId?: string) {
    return this.pharm.listSales(u.organizationId, userId);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "CAJERO")
  @Get("sales/summary/daily")
  async dailySalesSummary(@CurrentUser() u: AuthenticatedUser, @Query("date") date?: string) {
    return this.pharm.getDailySalesSummary(u.organizationId, date);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "CAJERO")
  @Get("sales/:id")
  async getSale(@CurrentUser() u: AuthenticatedUser, @Param("id") id: string) {
    return this.pharm.getSale(u.organizationId, id);
  }

  // --- DISPENSING ---
  @Roles("SUPERADMIN", "ADMIN", "DOCTOR")
  @Post("dispensings")
  async dispense(@CurrentUser() u: AuthenticatedUser, @Body() dto: CreateDispensingDto) {
    return this.pharm.dispenseFromPrescription(u.organizationId, u.userId, dto);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR")
  @Get("dispensings")
  async listDispensings(@CurrentUser() u: AuthenticatedUser, @Query("prescriptionId") prescriptionId?: string) {
    return this.pharm.listDispensings(u.organizationId, prescriptionId);
  }
}
