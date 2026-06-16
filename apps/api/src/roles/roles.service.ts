import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateRoleDto } from "./dto/create-role.dto";
import type { UpdateRoleDto } from "./dto/update-role.dto";
import type { RoleListDto, RoleListItemDto } from "./dto/role-list.dto";

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string): Promise<RoleListDto> {
    const roles = await this.prisma.role.findMany({
      where: { organizationId },
      include: {
        rolePermissions: { include: { permission: true } },
        userRoles: { select: { userId: true } },
      },
      orderBy: { code: "asc" },
    });

    const data: RoleListItemDto[] = roles.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description ?? null,
      isSystem: r.isSystem,
      permissions: r.rolePermissions.map((rp) => rp.permission),
      userCount: r.userRoles.length,
    }));

    return { data };
  }

  async findOne(organizationId: string, roleId: string): Promise<RoleListItemDto> {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, organizationId },
      include: {
        rolePermissions: { include: { permission: true } },
        userRoles: { select: { userId: true } },
      },
    });

    if (!role) throw new NotFoundException("Rol no encontrado");

    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description ?? null,
      isSystem: role.isSystem,
      permissions: role.rolePermissions.map((rp) => rp.permission),
      userCount: role.userRoles.length,
    };
  }

  async create(organizationId: string, dto: CreateRoleDto): Promise<RoleListItemDto> {
    const exists = await this.prisma.role.findUnique({
      where: { organizationId_code: { organizationId, code: dto.code } },
    });
    if (exists) throw new BadRequestException("Ya existe un rol con ese codigo");

    let permissions: { id: string; code: string; resource: string; action: string; description: string | null }[] = [];

    if (dto.permissionCodes && dto.permissionCodes.length > 0) {
      const found = await this.prisma.permission.findMany({
        where: { code: { in: dto.permissionCodes } },
      });
      if (found.length !== dto.permissionCodes.length) {
        const foundCodes = found.map((p) => p.code);
        const missing = dto.permissionCodes.filter((c) => !foundCodes.includes(c));
        throw new BadRequestException(`Permisos no encontrados: ${missing.join(", ")}`);
      }
      permissions = found;
    }

    const role = await this.prisma.role.create({
      data: {
        organizationId,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        rolePermissions: {
          create: permissions.map((p) => ({ permissionId: p.id })),
        },
      },
      include: {
        rolePermissions: { include: { permission: true } },
        userRoles: { select: { userId: true } },
      },
    });

    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description ?? null,
      isSystem: role.isSystem,
      permissions: role.rolePermissions.map((rp) => rp.permission),
      userCount: 0,
    };
  }

  async update(organizationId: string, roleId: string, dto: UpdateRoleDto): Promise<RoleListItemDto> {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, organizationId },
      include: { rolePermissions: true },
    });

    if (!role) throw new NotFoundException("Rol no encontrado");

    if (dto.permissionCodes !== undefined) {
      const found = await this.prisma.permission.findMany({
        where: { code: { in: dto.permissionCodes } },
      });

      if (found.length !== dto.permissionCodes.length) {
        const foundCodes = found.map((p) => p.code);
        const missing = dto.permissionCodes.filter((c) => !foundCodes.includes(c));
        throw new BadRequestException(`Permisos no encontrados: ${missing.join(", ")}`);
      }

      await this.prisma.rolePermission.deleteMany({ where: { roleId } });

      if (found.length > 0) {
        await this.prisma.rolePermission.createMany({
          data: found.map((p) => ({ roleId, permissionId: p.id })),
        });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;

    if (Object.keys(updateData).length > 0) {
      await this.prisma.role.update({ where: { id: roleId }, data: updateData as any });
    }

    return this.findOne(organizationId, roleId);
  }
}
