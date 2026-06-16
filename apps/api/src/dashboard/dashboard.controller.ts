import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.type";

@ApiTags("Dashboard")
@ApiBearerAuth()
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "RECEPTION")
  @ApiOperation({ summary: "Estadisticas del dashboard" })
  @Get("stats")
  async getStats(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.getStats(user.organizationId);
  }
}
