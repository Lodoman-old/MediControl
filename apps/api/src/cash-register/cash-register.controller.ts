import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { IsOptional, IsString, IsNumber, Min } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

class OpenCashRegisterDto {
  @ApiProperty() @IsString() branchId!: string;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsNumber() @Min(0) initialAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

class CloseCashRegisterDto {
  @ApiProperty() @IsNumber() @Min(0) actualAmount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

@ApiTags("Caja")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("cash-register")
export class CashRegisterController {
  constructor(private readonly prisma: PrismaService) {}

  @Roles("SUPERADMIN", "ADMIN")
  @ApiOperation({ summary: "Abrir caja" })
  @Post("open")
  async open(@CurrentUser() u: AuthenticatedUser, @Body() dto: OpenCashRegisterDto) {
    const existing = await this.prisma.cashRegister.findFirst({
      where: { organizationId: u.organizationId, branchId: dto.branchId, status: "OPEN" },
    });
    if (existing) throw new Error("Ya hay una caja abierta en esta sucursal");

    return this.prisma.cashRegister.create({
      data: {
        organizationId: u.organizationId,
        branchId: dto.branchId,
        initialAmount: dto.initialAmount ?? 0,
        notes: dto.notes,
        openedByUserId: u.userId,
      },
    });
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR")
  @ApiOperation({ summary: "Obtener caja activa" })
  @Get("active")
  async getActive(@CurrentUser() u: AuthenticatedUser, @Query("branchId") branchId?: string) {
    const where: any = { organizationId: u.organizationId, status: "OPEN" };
    if (branchId) where.branchId = branchId;
    return this.prisma.cashRegister.findFirst({
      where,
      include: {
        openedBy: { select: { id: true, email: true, person: { select: { firstName: true, lastNameP: true } } } },
        movements: { orderBy: { createdAt: "desc" }, take: 50 },
      },
    });
  }

  @Roles("SUPERADMIN", "ADMIN")
  @ApiOperation({ summary: "Cerrar caja" })
  @Patch(":id/close")
  async close(@Param("id") id: string, @CurrentUser() u: AuthenticatedUser, @Body() dto: CloseCashRegisterDto) {
    const register = await this.prisma.cashRegister.findFirst({ where: { id, organizationId: u.organizationId } });
    if (!register) throw new Error("Caja no encontrada");
    if (register.status !== "OPEN") throw new Error("La caja ya esta cerrada");

    const sales = await this.prisma.sale.aggregate({
      where: {
        organizationId: u.organizationId,
        branchId: register.branchId,
        createdAt: { gte: register.openedAt },
        status: "COMPLETED",
      },
      _sum: { total: true },
    });
    const expectedAmount = Number(register.initialAmount) + Number(sales._sum.total ?? 0);
    const difference = dto.actualAmount - expectedAmount;

    return this.prisma.cashRegister.update({
      where: { id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        closedByUserId: u.userId,
        expectedAmount,
        actualAmount: dto.actualAmount,
        difference,
        notes: dto.notes ?? undefined,
      },
    });
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR")
  @ApiOperation({ summary: "Historial de cortes" })
  @Get("history")
  async history(@CurrentUser() u: AuthenticatedUser, @Query("branchId") branchId?: string) {
    const where: any = { organizationId: u.organizationId };
    if (branchId) where.branchId = branchId;
    return this.prisma.cashRegister.findMany({
      where,
      orderBy: { openedAt: "desc" },
      take: 30,
      include: {
        openedBy: { select: { id: true, email: true, person: { select: { firstName: true, lastNameP: true } } } },
        closedBy: { select: { id: true, email: true, person: { select: { firstName: true, lastNameP: true } } } },
      },
    });
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR")
  @ApiOperation({ summary: "Detalle de corte" })
  @Get(":id")
  async getOne(@Param("id") id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.prisma.cashRegister.findFirst({
      where: { id, organizationId: u.organizationId },
      include: {
        openedBy: { select: { id: true, email: true, person: { select: { firstName: true, lastNameP: true } } } },
        closedBy: { select: { id: true, email: true, person: { select: { firstName: true, lastNameP: true } } } },
        movements: { orderBy: { createdAt: "desc" } },
      },
    });
  }
}
