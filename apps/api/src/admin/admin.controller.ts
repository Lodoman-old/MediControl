import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { AdminService } from "./admin.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { PaginatedUserListDto, UserListItemDto } from "./dto/user-list.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import type { AuthenticatedUser } from "../auth/types/authenticated-user.type";

@ApiTags("Admin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "RECEPTION")
  @ApiOperation({ summary: "Listar usuarios", description: "Lista paginada de usuarios de la organizacion." })
  @ApiOkResponse({ type: PaginatedUserListDto })
  @Get("users")
  async listUsers(
    @CurrentUser() user: AuthenticatedUser,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("role") role?: string,
  ): Promise<PaginatedUserListDto> {
    return this.admin.listUsers(user.organizationId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      status,
      role,
    });
  }

  @Roles("SUPERADMIN", "ADMIN")
  @ApiOperation({ summary: "Obtener usuario", description: "Detalle de un usuario por ID." })
  @ApiOkResponse({ type: UserListItemDto })
  @Get("users/:id")
  async getUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ): Promise<UserListItemDto> {
    return this.admin.getUser(user.organizationId, id);
  }

  @Roles("SUPERADMIN", "ADMIN")
  @ApiOperation({ summary: "Crear usuario", description: "Crea un nuevo usuario con roles y sucursal." })
  @ApiOkResponse({ type: UserListItemDto })
  @Post("users")
  @HttpCode(HttpStatus.CREATED)
  async createUser(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateUserDto,
  ): Promise<UserListItemDto> {
    return this.admin.createUser(user.organizationId, dto);
  }

  @Roles("SUPERADMIN", "ADMIN")
  @ApiOperation({ summary: "Actualizar usuario", description: "Actualiza datos, roles y estado de un usuario." })
  @ApiOkResponse({ type: UserListItemDto })
  @Patch("users/:id")
  async updateUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserListItemDto> {
    return this.admin.updateUser(user.organizationId, id, dto);
  }

  @Roles("SUPERADMIN", "ADMIN", "DOCTOR", "CAJERO")
  @ApiOperation({ summary: "Listar sucursales", description: "Lista las sucursales de la organizacion." })
  @Get("branches")
  async listBranches(@CurrentUser() user: AuthenticatedUser) {
    const branches = await this.admin.listBranches(user.organizationId);
    return { data: branches };
  }

  @Roles("SUPERADMIN", "ADMIN")
  @ApiOperation({ summary: "Resetear contrasena", description: "Genera una nueva contrasena temporal para un usuario. Invalida todos sus refresh tokens." })
  @ApiOkResponse({ description: "Contrasena actualizada" })
  @Post("users/:id/reset-password")
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ResetPasswordDto,
  ): Promise<void> {
    return this.admin.resetPassword(user.organizationId, id, dto);
  }
}
