import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { SettingsService } from "./settings.service";

@ApiTags("Branding")
@ApiBearerAuth()
@Controller("branding")
export class BrandingController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @ApiOperation({ summary: "Branding de la clinica del usuario autenticado" })
  getBranding(@CurrentUser() user: AuthenticatedUser) {
    return this.settings.getBranding(user.organizationId);
  }
}
