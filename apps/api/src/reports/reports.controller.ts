import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from "@nestjs/swagger";
import { ReportsService } from "./reports.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.type";

@ApiTags("Reportes")
@ApiBearerAuth()
@Controller("reports")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Roles("SUPERADMIN", "ADMIN")
  @Get("revenue")
  @ApiQuery({ name: "from", required: false })
  @ApiQuery({ name: "to", required: false })
  @ApiQuery({ name: "groupBy", required: false, enum: ["doctor", "service"] })
  @ApiOperation({ summary: "Reporte de ingresos" })
  async revenue(
    @CurrentUser() user: AuthenticatedUser,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("groupBy") groupBy?: string,
  ) {
    return this.reports.revenue(user.organizationId, from, to, groupBy);
  }

  @Roles("SUPERADMIN", "ADMIN")
  @Get("appointments")
  @ApiQuery({ name: "from", required: false })
  @ApiQuery({ name: "to", required: false })
  @ApiOperation({ summary: "Reporte de citas" })
  async appointments(
    @CurrentUser() user: AuthenticatedUser,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.reports.appointments(user.organizationId, from, to);
  }

  @Roles("SUPERADMIN", "ADMIN")
  @Get("patients")
  @ApiQuery({ name: "from", required: false })
  @ApiQuery({ name: "to", required: false })
  @ApiOperation({ summary: "Reporte de pacientes" })
  async patients(
    @CurrentUser() user: AuthenticatedUser,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.reports.patients(user.organizationId, from, to);
  }

  @Roles("SUPERADMIN", "ADMIN")
  @Get("doctors")
  @ApiQuery({ name: "from", required: false })
  @ApiQuery({ name: "to", required: false })
  @ApiOperation({ summary: "Reporte de productividad de medicos" })
  async doctors(
    @CurrentUser() user: AuthenticatedUser,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.reports.doctors(user.organizationId, from, to);
  }
}
