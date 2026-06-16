import { Controller, Get, Post, Patch, Body, Param, Query, Headers, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags, ApiExcludeEndpoint } from "@nestjs/swagger";
import { PaymentService } from "./payment.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { Public } from "../auth/decorators/public.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { CreatePaymentDto, UpdatePaymentStatusDto, PaymentFilterDto } from "./dto/payment.dto";
import type { Request } from "express";

@ApiTags("Pagos")
@ApiBearerAuth()
@Controller("payments")
export class PaymentController {
  constructor(private readonly payment: PaymentService) {}

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR")
  @ApiOperation({ summary: "Resumen de pagos del día" })
  @Get("summary/daily")
  async dailySummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query("date") date?: string,
  ) {
    return this.payment.getDailySummary(user.organizationId, date);
  }

  @Public()
  @Post("mercadopago/webhook")
  @ApiExcludeEndpoint()
  async mercadopagoWebhook(@Req() req: Request) {
    return this.payment.handleMercadoPagoWebhook(req.body);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR")
  @ApiOperation({ summary: "Registrar un pago" })
  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePaymentDto) {
    return this.payment.create(user.organizationId, user.userId, dto);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR")
  @ApiOperation({ summary: "Listar pagos" })
  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser, @Query() filters?: PaymentFilterDto) {
    return this.payment.findAll(user.organizationId, filters);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR")
  @ApiOperation({ summary: "Obtener detalle de pago" })
  @Get(":id")
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.payment.findOne(user.organizationId, id);
  }

  @Roles("SUPERADMIN", "ADMIN")
  @ApiOperation({ summary: "Actualizar estado de pago" })
  @Patch(":id/status")
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    return this.payment.updateStatus(user.organizationId, id, dto);
  }
}
