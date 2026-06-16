import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { hash as argonHash } from "@node-rs/argon2";
import { Gender } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateUserDto } from "./dto/create-user.dto";
import type { UpdateUserDto } from "./dto/update-user.dto";
import type { PaginatedUserListDto, UserListItemDto } from "./dto/user-list.dto";
import type { ResetPasswordDto } from "./dto/reset-password.dto";

function parseFullName(fullName: string): { firstName: string; lastNameP: string; lastNameM: string | null } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return { firstName: "-", lastNameP: "-", lastNameM: null };
  if (parts.length === 1) return { firstName: parts[0], lastNameP: "-", lastNameM: null };
  if (parts.length === 2) return { firstName: parts[0], lastNameP: parts[1], lastNameM: null };
  return { firstName: parts[0], lastNameP: parts[1], lastNameM: parts.slice(2).join(" ") };
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listUsers(
    organizationId: string,
    query: { page?: number; limit?: number; search?: string; status?: string; role?: string },
  ): Promise<PaginatedUserListDto> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { organizationId };

    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: "insensitive" } },
        { person: { firstName: { contains: query.search, mode: "insensitive" } } },
        { person: { lastNameP: { contains: query.search, mode: "insensitive" } } },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.role) {
      where.userRoles = { some: { role: { code: query.role } } };
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where: where as any }),
      this.prisma.user.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          person: true,
          doctor: true,
          userRoles: {
            include: {
              role: true,
              branch: true,
            },
          },
        },
      }),
    ]);

    const data: UserListItemDto[] = users.map((u) => {
      const fullName = u.person
        ? `${u.person.firstName} ${u.person.lastNameP} ${u.person.lastNameM ?? ""}`.trim()
        : u.email;
      const roles = u.userRoles.map((ur) => ur.role.code);
      const branchName = u.userRoles.find((ur) => ur.branch)?.branch?.name ?? null;

      const userBranch = u.userRoles.find((ur) => ur.branch);
      return {
        id: u.id,
        email: u.email,
        fullName,
        roles,
        status: u.status,
        mustChangePassword: u.mustChangePassword,
        branchId: userBranch?.branch?.id ?? null,
        branchName,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
        specialtyCode: u.doctor?.specialtyCode ?? null,
        cedulaProfesional: u.doctor?.cedulaProfesional ?? null,
      };
    });

    return {
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async listBranches(organizationId: string) {
    return this.prisma.branch.findMany({
      where: { organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  async getUser(organizationId: string, userId: string): Promise<UserListItemDto> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
      include: {
        person: true,
        doctor: true,
        userRoles: {
          include: { role: true, branch: true },
        },
      },
    });

    if (!user) throw new NotFoundException("Usuario no encontrado");

    const fullName = user.person
      ? `${user.person.firstName} ${user.person.lastNameP} ${user.person.lastNameM ?? ""}`.trim()
      : user.email;
    const roles = user.userRoles.map((ur) => ur.role.code);
    const userBranch = user.userRoles.find((ur) => ur.branch);
    const branchName = userBranch?.branch?.name ?? null;
    const branchId = userBranch?.branch?.id ?? null;

    return {
      id: user.id,
      email: user.email,
      fullName,
      roles,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      branchId,
      branchName,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      specialtyCode: user.doctor?.specialtyCode ?? null,
      cedulaProfesional: user.doctor?.cedulaProfesional ?? null,
    };
  }

  async createUser(organizationId: string, dto: CreateUserDto): Promise<UserListItemDto> {
    const existing = await this.prisma.user.findFirst({
      where: { organizationId, email: dto.email },
    });
    if (existing) {
      throw new BadRequestException("Ya existe un usuario con ese email en esta organizacion");
    }

    const roles = await this.prisma.role.findMany({
      where: { organizationId, code: { in: dto.roles } },
    });
    if (roles.length !== dto.roles.length) {
      const found = roles.map((r) => r.code);
      const missing = dto.roles.filter((r) => !found.includes(r));
      throw new BadRequestException(`Roles no encontrados: ${missing.join(", ")}`);
    }

    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: dto.branchId, organizationId },
      });
      if (!branch) throw new BadRequestException("Sucursal no encontrada");
    }

    const passwordHash = await argonHash(dto.password);

    const parsed = parseFullName(dto.fullName);

    const person = await this.prisma.person.create({
      data: {
        organizationId,
        firstName: parsed.firstName,
        lastNameP: parsed.lastNameP,
        lastNameM: parsed.lastNameM,
        birthDate: new Date("2000-01-01"),
        gender: Gender.X,
      },
    });

    const user = await this.prisma.user.create({
      data: {
        organizationId,
        email: dto.email,
        passwordHash,
        personId: person.id,
        mustChangePassword: true,
        userRoles: {
          create: roles.map((r) => ({
            organizationId,
            roleId: r.id,
            branchId: dto.branchId ?? null,
          })),
        },
      },
      include: {
        person: true,
        doctor: true,
        userRoles: {
          include: { role: true, branch: true },
        },
      },
    });

    if (dto.roles.includes("DOCTOR")) {
      await this.prisma.doctor.create({
        data: {
          organizationId,
          personId: person.id,
          userId: user.id,
          specialtyCode: dto.specialtyCode ?? "GEN",
          cedulaProfesional: dto.cedulaProfesional ?? "PENDIENTE",
        },
      });
    }

    this.logger.log(`Usuario creado: ${user.email} (${user.id})`);

    const fullName = `${user.person!.firstName} ${user.person!.lastNameP} ${user.person!.lastNameM ?? ""}`.trim();
    const roleCodes = user.userRoles.map((ur) => ur.role.code);
    const branchData = user.userRoles.find((ur) => ur.branch);

    return {
      id: user.id,
      email: user.email,
      fullName,
      roles: roleCodes,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      branchId: branchData?.branch?.id ?? null,
      branchName: branchData?.branch?.name ?? null,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      specialtyCode: user.doctor?.specialtyCode ?? null,
      cedulaProfesional: user.doctor?.cedulaProfesional ?? null,
    };
  }

  async updateUser(
    organizationId: string,
    userId: string,
    dto: UpdateUserDto,
  ): Promise<UserListItemDto> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
      include: { person: true, doctor: true, userRoles: { include: { role: true, branch: true } } },
    });
    if (!user) throw new NotFoundException("Usuario no encontrado");

    const updateData: Record<string, unknown> = {};

    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.status !== undefined) updateData.status = dto.status;

    if (Object.keys(updateData).length > 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: updateData as any,
      });
    }

    if (dto.fullName !== undefined && user.person) {
      const parsed = parseFullName(dto.fullName);
      await this.prisma.person.update({
        where: { id: user.person.id },
        data: {
          firstName: parsed.firstName,
          lastNameP: parsed.lastNameP,
          lastNameM: parsed.lastNameM,
        },
      });
    }

    if (dto.roles !== undefined) {
      await this.prisma.userRole.deleteMany({ where: { userId } });

      const roles = await this.prisma.role.findMany({
        where: { organizationId, code: { in: dto.roles } },
      });

      if (roles.length > 0) {
        await this.prisma.userRole.createMany({
          data: roles.map((r) => ({
            organizationId,
            userId,
            roleId: r.id,
            branchId: dto.branchId ?? null,
          })),
        });
      }

      const wantsDoctor = dto.roles.includes("DOCTOR");
      const existingDoctor = user.doctor ?? null;

      if (wantsDoctor && !existingDoctor && user.person) {
        await this.prisma.doctor.create({
          data: {
            organizationId,
            personId: user.person.id,
            userId,
            specialtyCode: dto.specialtyCode ?? "GEN",
            cedulaProfesional: dto.cedulaProfesional ?? "PENDIENTE",
          },
        });
      } else if (wantsDoctor && existingDoctor && user.person) {
        await this.prisma.doctor.update({
          where: { id: existingDoctor.id },
          data: {
            specialtyCode: dto.specialtyCode ?? existingDoctor.specialtyCode,
            cedulaProfesional: dto.cedulaProfesional ?? existingDoctor.cedulaProfesional,
          },
        });
      }
    } else {
      const existingDoctor = user.doctor ?? null;
      if (existingDoctor) {
        const updateDoctor: Record<string, unknown> = {};
        if (dto.specialtyCode !== undefined) updateDoctor.specialtyCode = dto.specialtyCode;
        if (dto.cedulaProfesional !== undefined) updateDoctor.cedulaProfesional = dto.cedulaProfesional;
        if (Object.keys(updateDoctor).length > 0) {
          await this.prisma.doctor.update({ where: { id: existingDoctor.id }, data: updateDoctor as any });
        }
      }
    }

    return this.getUser(organizationId, userId);
  }

  async resetPassword(
    organizationId: string,
    userId: string,
    dto: ResetPasswordDto,
  ): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
    });
    if (!user) throw new NotFoundException("Usuario no encontrado");

    const passwordHash = await argonHash(dto.newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: true,
      },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    this.logger.log(`Password reseteado para usuario ${user.email}`);
  }
}
