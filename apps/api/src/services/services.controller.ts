import { Body, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.type";

class CreateServiceDto {
  @IsString() code!: string;
  @IsString() name!: string;
  @IsNumber() durationMin!: number;
  @IsNumber() defaultPrice!: number;
  @IsOptional() @IsString() description?: string;
}

class UpdateServiceDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsNumber() durationMin?: number;
  @IsOptional() @IsNumber() defaultPrice?: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@ApiTags("Servicios")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("services")
export class ServicesController {
  constructor(private readonly prisma: PrismaService) {}

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "RECEPTION")
  @ApiOperation({ summary: "Listar servicios medicos" })
  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    const services = await this.prisma.service.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, code: true, name: true, durationMin: true, defaultPrice: true, description: true, isActive: true },
      orderBy: { name: "asc" },
    });
    return { data: services };
  }

  @Roles("SUPERADMIN", "ADMIN")
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateServiceDto) {
    const service = await this.prisma.service.create({
      data: { organizationId: user.organizationId, ...dto },
    });
    return service;
  }

  @Roles("SUPERADMIN", "ADMIN")
  @Patch(":id")
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    const service = await this.prisma.service.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!service) throw new NotFoundException("Servicio no encontrado");
    return this.prisma.service.update({ where: { id }, data: dto });
  }

  @Roles("SUPERADMIN", "ADMIN")
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    const service = await this.prisma.service.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!service) throw new NotFoundException("Servicio no encontrado");
    await this.prisma.service.delete({ where: { id } });
  }
}
