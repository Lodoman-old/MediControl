import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { SettingsService } from "./settings.service";
import { UpdateIntegrationDto, UpdateOrganizationSettingsDto } from "./dto/settings.dto";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.type";

@ApiTags("Configuracion")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles("SUPERADMIN", "ADMIN")
@Controller("admin/settings")
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @ApiOperation({
    summary: "Obtener configuracion",
    description: "Datos de la clinica e integraciones (secretos enmascarados).",
  })
  @ApiOkResponse({ description: "Configuracion de la organizacion" })
  @Get()
  async get(@CurrentUser() user: AuthenticatedUser) {
    return this.settings.getSettings(user.organizationId);
  }

  @ApiOperation({ summary: "Actualizar configuracion de la clinica" })
  @Patch()
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateOrganizationSettingsDto,
  ) {
    return this.settings.updateSettings(user.organizationId, dto);
  }

  @ApiOperation({
    summary: "Generar claves VAPID para Web Push",
    description: "Genera y guarda un par de claves nuevo y activa Web Push. Invalida suscripciones previas.",
  })
  @Post("integrations/web-push/generate")
  async generateWebPushKeys(@CurrentUser() user: AuthenticatedUser) {
    return this.settings.generateWebPushKeys(user.organizationId, user.userId);
  }

  @ApiOperation({
    summary: "Guardar integracion",
    description: "Guarda credenciales cifradas. Los secretos vacios conservan el valor actual.",
  })
  @Put("integrations/:provider")
  async updateIntegration(
    @CurrentUser() user: AuthenticatedUser,
    @Param("provider") provider: string,
    @Body() dto: UpdateIntegrationDto,
  ) {
    return this.settings.updateIntegration(
      user.organizationId,
      provider.toUpperCase(),
      dto.isEnabled ?? false,
      dto.config ?? {},
      user.userId,
    );
  }
}
