import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { LabIntegrationService } from "./lab-integration.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { CreateLabProviderDto, UpdateLabProviderDto } from "./dto/lab-provider.dto";

@ApiTags("Integracion Laboratorio")
@ApiBearerAuth()
@Controller("lab-integration")
export class LabIntegrationController {
  constructor(private readonly lab: LabIntegrationService) {}

  @Roles("SUPERADMIN", "ADMIN")
  @ApiOperation({ summary: "Configurar proveedor de laboratorio" })
  @Post("providers")
  async createProvider(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateLabProviderDto) {
    return this.lab.createProvider(user.organizationId, dto);
  }

  @Roles("SUPERADMIN", "ADMIN")
  @ApiOperation({ summary: "Listar proveedores configurados" })
  @Get("providers")
  async listProviders(@CurrentUser() user: AuthenticatedUser) {
    return this.lab.listProviders(user.organizationId);
  }

  @Roles("SUPERADMIN", "ADMIN")
  @ApiOperation({ summary: "Actualizar proveedor" })
  @Patch("providers/:id")
  async updateProvider(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateLabProviderDto,
  ) {
    return this.lab.updateProvider(user.organizationId, id, dto);
  }

  @Roles("SUPERADMIN", "ADMIN")
  @ApiOperation({ summary: "Eliminar proveedor" })
  @Delete("providers/:id")
  async removeProvider(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.lab.removeProvider(user.organizationId, id);
  }

  @Roles("SUPERADMIN", "ADMIN")
  @ApiOperation({ summary: "Sincronizar ordenes con proveedor" })
  @Post("sync")
  async syncLabOrders(
    @CurrentUser() user: AuthenticatedUser,
    @Query("providerId") providerId?: string,
  ) {
    return this.lab.syncLabOrders(user.organizationId, providerId);
  }

  @Roles("SUPERADMIN", "ADMIN")
  @ApiOperation({ summary: "Recibir resultados de laboratorio (webhook simulado)" })
  @Post("results/:providerCode")
  async receiveResults(
    @CurrentUser() user: AuthenticatedUser,
    @Param("providerCode") providerCode: string,
    @Body() body: { results: Array<{ orderRef: string; resultText: string; resultDate?: string }> },
  ) {
    return this.lab.receiveResults(user.organizationId, providerCode, body.results);
  }
}
