import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { RolesService } from "./roles.service";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { RoleListDto, RoleListItemDto } from "./dto/role-list.dto";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.type";

@ApiTags("Roles")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("roles")
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Roles("SUPERADMIN", "ADMIN")
  @ApiOperation({ summary: "Listar roles", description: "Lista todos los roles de la organizacion con sus permisos." })
  @ApiOkResponse({ type: RoleListDto })
  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser): Promise<RoleListDto> {
    return this.roles.findAll(user.organizationId);
  }

  @Roles("SUPERADMIN", "ADMIN")
  @ApiOperation({ summary: "Obtener rol", description: "Detalle de un rol por ID." })
  @ApiOkResponse({ type: RoleListItemDto })
  @Get(":id")
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ): Promise<RoleListItemDto> {
    return this.roles.findOne(user.organizationId, id);
  }

  @Roles("SUPERADMIN", "ADMIN")
  @ApiOperation({ summary: "Crear rol", description: "Crea un nuevo rol con permisos." })
  @ApiOkResponse({ type: RoleListItemDto })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRoleDto,
  ): Promise<RoleListItemDto> {
    return this.roles.create(user.organizationId, dto);
  }

  @Roles("SUPERADMIN", "ADMIN")
  @ApiOperation({ summary: "Actualizar rol", description: "Actualiza nombre, descripcion y permisos de un rol." })
  @ApiOkResponse({ type: RoleListItemDto })
  @Patch(":id")
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleListItemDto> {
    return this.roles.update(user.organizationId, id, dto);
  }
}
