import { Body, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ServiceLocationType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.type";

@ApiTags("Ubicaciones")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("service-locations")
export class ServiceLocationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "RECEPTION")
  @Get()
  async findByBranch(@CurrentUser() user: AuthenticatedUser, @Query("branchId") branchId?: string) {
    const where: Record<string, unknown> = { organizationId: user.organizationId };
    if (branchId) where.branchId = branchId;
    const locations = await this.prisma.serviceLocation.findMany({
      where: where as any,
      select: { id: true, name: true, code: true, branchId: true, locationType: true, isActive: true },
      orderBy: { name: "asc" },
    });
    return { data: locations };
  }

  @Roles("SUPERADMIN", "ADMIN")
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser() user: AuthenticatedUser, @Body() body: { branchId: string; code: string; name: string; locationType?: ServiceLocationType }) {
    return this.prisma.serviceLocation.create({
      data: { organizationId: user.organizationId, branchId: body.branchId, code: body.code, name: body.name, locationType: body.locationType ?? ServiceLocationType.EXAM_ROOM },
    });
  }

  @Roles("SUPERADMIN", "ADMIN")
  @Patch(":id")
  async update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() body: { name?: string; code?: string; locationType?: ServiceLocationType; isActive?: boolean }) {
    const loc = await this.prisma.serviceLocation.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!loc) throw new NotFoundException();
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.code !== undefined) data.code = body.code;
    if (body.locationType !== undefined) data.locationType = body.locationType;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    return this.prisma.serviceLocation.update({ where: { id }, data: data as any });
  }

  @Roles("SUPERADMIN", "ADMIN")
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    const loc = await this.prisma.serviceLocation.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!loc) throw new NotFoundException();
    await this.prisma.serviceLocation.delete({ where: { id } });
  }
}
