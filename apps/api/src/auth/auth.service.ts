import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import {
  hash as argonHash,
  verify as argonVerify,
} from "@node-rs/argon2";
import { randomUUID, randomBytes } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import type { LoginResponseDto, MeResponseDto } from "./dto/auth-response.dto";
import type { AccessTokenPayload, RefreshTokenPayload } from "./types/jwt-payload.type";
import { MfaService } from "./mfa/mfa.service";

const REFRESH_COOKIE = "refresh_token";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mfa: MfaService,
    private readonly mail: MailService,
  ) {}

  private get accessExpiresInSeconds(): number {
    const raw = this.config.get<string>("JWT_ACCESS_EXPIRES_IN") ?? "15m";
    return this.parseExpiryToSeconds(raw);
  }

  private get refreshExpiresInSeconds(): number {
    const raw = this.config.get<string>("JWT_REFRESH_EXPIRES_IN") ?? "7d";
    return this.parseExpiryToSeconds(raw);
  }

  private parseExpiryToSeconds(value: string): number {
    const match = /^(\d+)([smhd])?$/.exec(value.trim());
    if (!match) return 900;
    const n = Number(match[1]);
    const unit = match[2] ?? "s";
    const mult = unit === "d" ? 86400 : unit === "h" ? 3600 : unit === "m" ? 60 : 1;
    return n * mult;
  }

  private refreshCookieOptions() {
    const secure =
      (this.config.get<string>("COOKIE_SECURE") ?? "false") === "true";
    return {
      httpOnly: true,
      secure,
      sameSite: "lax" as const,
      path: "/",
      maxAge: this.refreshExpiresInSeconds * 1000,
      domain: this.config.get<string>("COOKIE_DOMAIN") || undefined,
    };
  }

  async login(
    email: string,
    password: string,
    userAgent?: string,
    ip?: string,
  ): Promise<LoginResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: { email },
      include: {
        person: true,
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: { select: { code: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException("Credenciales invalidas");
    }
    if (user.status !== "ACTIVE") {
      throw new UnauthorizedException("Usuario inactivo");
    }

    const ok = user.passwordHash
      ? await argonVerify(user.passwordHash, password)
      : false;
    if (!ok) {
      this.logger.warn(`Login fallido para ${email} desde ${ip ?? "?"}`);
      throw new UnauthorizedException("Credenciales invalidas");
    }

    const roles: string[] = user.userRoles.map((ur) => ur.role.code);
    const permissions: string[] = Array.from(
      new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.code),
        ),
      ),
    );
    const branchId = user.userRoles.find((ur) => ur.branchId)?.branchId ?? null;

    if (user.mfaEnabled) {
      const mfaToken = await this.mfa.generateMfaToken(user.id, user.email);
      return {
        mfaRequired: true,
        mfaToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: this.buildFullName(user.person),
          organizationId: user.organizationId,
          branchId,
          roles,
          permissions,
          mustChangePassword: user.mustChangePassword,
        },
      } as unknown as LoginResponseDto;
    }

    const tokens = await this.issueTokens({
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId,
      branchId,
      roles,
      permissions,
      userAgent,
      ip,
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: this.buildFullName(user.person),
        organizationId: user.organizationId,
        branchId,
        roles,
        permissions,
        mustChangePassword: user.mustChangePassword,
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessExpiresIn: this.accessExpiresInSeconds,
      },
    };
  }

  private buildFullName(person: {
    firstName: string;
    lastNameP: string;
    lastNameM: string | null;
  } | null): string {
    if (!person) return "";
    return `${person.firstName} ${person.lastNameP} ${person.lastNameM ?? ""}`.trim();
  }

  private async issueTokens(args: {
    userId: string;
    email: string;
    organizationId: string;
    branchId: string | null;
    roles: string[];
    permissions: string[];
    userAgent?: string;
    ip?: string;
  }): Promise<{ accessToken: string; refreshToken: string; refreshJti: string }> {
    const accessPayload: AccessTokenPayload = {
      sub: args.userId,
      email: args.email,
      orgId: args.organizationId,
      branchId: args.branchId,
      roles: args.roles,
      permissions: args.permissions,
      type: "access",
    };

    const refreshJti = randomUUID();
    const refreshPayload: RefreshTokenPayload = {
      sub: args.userId,
      jti: refreshJti,
      type: "refresh",
    };

    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: this.config.get<string>("JWT_ACCESS_SECRET"),
      expiresIn: `${this.accessExpiresInSeconds}s`,
    });
    const refreshToken = await this.jwt.signAsync(refreshPayload, {
      secret: this.config.get<string>("JWT_REFRESH_SECRET"),
      expiresIn: `${this.refreshExpiresInSeconds}s`,
    });

    const expiresAt = new Date(Date.now() + this.refreshExpiresInSeconds * 1000);
    await this.prisma.refreshToken.create({
      data: {
        id: refreshJti,
        organizationId: args.organizationId,
        userId: args.userId,
        family: refreshJti,
        tokenHash: await argonHash(refreshToken),
        expiresAt,
        userAgent: args.userAgent ?? null,
        ipAddress: args.ip ?? null,
      },
    });

    return { accessToken, refreshToken, refreshJti };
  }

  getRefreshCookieName(): string {
    return REFRESH_COOKIE;
  }

  getRefreshCookieOptions() {
    return this.refreshCookieOptions();
  }

  async refresh(args: {
    userId: string;
    jti: string;
    refreshToken: string | undefined;
    userAgent?: string;
    ip?: string;
  }): Promise<LoginResponseDto> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { id: args.jti },
      include: {
        user: {
          include: {
            person: true,
            userRoles: true,
          },
        },
      },
    });

    if (!stored || stored.revokedAt) {
      // Reuso detectado: revocar toda la familia
      if (stored?.userId) {
        await this.prisma.refreshToken.updateMany({
          where: { userId: stored.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        this.logger.error(
          `Posible robo de refresh token para userId=${stored.userId}. Sesiones revocadas.`,
        );
      }
      throw new UnauthorizedException("Refresh token invalido o revocado");
    }

    const ok = args.refreshToken
      ? await argonVerify(stored.tokenHash, args.refreshToken)
      : false;
    if (!ok) {
      throw new UnauthorizedException("Refresh token invalido");
    }
    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Refresh token expirado");
    }

    // Rotacion: revocar el actual
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const user = stored.user;
    if (user.status !== "ACTIVE") {
      throw new UnauthorizedException("Usuario inactivo");
    }

    // Recargar permisos y roles reales (stored solo trae userRoles basico)
    const userFull = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: {
        person: true,
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: { select: { code: true } } } },
              },
            },
          },
        },
      },
    });
    const roleCodes: string[] = userFull.userRoles.map((ur) => ur.role.code);
    const perms: string[] = Array.from(
      new Set(
        userFull.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.code),
        ),
      ),
    );
    const branchId = userFull.userRoles.find((ur) => ur.branchId)?.branchId ?? null;

    const tokens = await this.issueTokens({
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId,
      branchId,
      roles: roleCodes,
      permissions: perms,
      userAgent: args.userAgent,
      ip: args.ip,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: this.buildFullName(userFull.person),
        organizationId: user.organizationId,
        branchId,
        roles: roleCodes,
        permissions: perms,
        mustChangePassword: user.mustChangePassword,
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessExpiresIn: this.accessExpiresInSeconds,
      },
    };
  }

  async logout(userId: string, jti?: string): Promise<void> {
    if (jti) {
      await this.prisma.refreshToken.updateMany({
        where: { id: jti, userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } else {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  }

  async issueUserTokens(args: {
    userId: string;
    email: string;
    organizationId: string;
    branchId: string | null;
    roles: string[];
    permissions: string[];
    userAgent?: string;
    ip?: string;
  }): Promise<{ accessToken: string; refreshToken: string; refreshJti: string; accessExpiresIn: number }> {
    const tokens = await this.issueTokens(args);
    return { ...tokens, accessExpiresIn: this.accessExpiresInSeconds };
  }

  async me(userId: string): Promise<MeResponseDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        person: true,
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: { select: { code: true } } } },
              },
            },
          },
        },
      },
    });

    const roles: string[] = user.userRoles.map((ur) => ur.role.code);
    const permissions: string[] = Array.from(
      new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.code),
        ),
      ),
    );
    const branchId = user.userRoles.find((ur) => ur.branchId)?.branchId ?? null;

    return {
      id: user.id,
      email: user.email,
      fullName: this.buildFullName(user.person),
      organizationId: user.organizationId,
      branchId,
      roles,
      permissions,
      mustChangePassword: user.mustChangePassword,
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    if (user.status !== "ACTIVE") {
      throw new ForbiddenException("Usuario inactivo");
    }

    const ok = user.passwordHash
      ? await argonVerify(user.passwordHash, currentPassword)
      : false;
    if (!ok) {
      throw new BadRequestException("Contrasena actual incorrecta");
    }

    if (currentPassword === newPassword) {
      throw new BadRequestException(
        "La nueva contrasena debe ser diferente a la actual",
      );
    }

    const newHash = await argonHash(newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
    });
  }

  async register(dto: {
    firstName: string;
    lastNameP: string;
    lastNameM?: string;
    email: string;
    phone: string;
    password: string;
    birthDate: string;
    gender: string;
    curp?: string;
    nationality?: string;
    occupation?: string;
  }): Promise<LoginResponseDto> {
    const orgId = this.config.get<string>("DEFAULT_ORG_ID") ?? "00000000-0000-0000-0000-000000000001";
    const branchId = this.config.get<string>("DEFAULT_BRANCH_ID") ?? "00000000-0000-0000-0000-000000000010";

    const existing = await this.prisma.user.findFirst({
      where: { organizationId: orgId, email: dto.email },
    });
    if (existing) throw new ConflictException("El email ya esta registrado");

    const passwordHash = await argonHash(dto.password);
    const mrn = await this.generateMrn(orgId);

    const result = await this.prisma.$transaction(async (tx) => {
      const person = await tx.person.create({
        data: {
          organizationId: orgId,
          firstName: dto.firstName,
          lastNameP: dto.lastNameP,
          lastNameM: dto.lastNameM ?? null,
          birthDate: new Date(dto.birthDate),
          gender: dto.gender as any,
          curp: dto.curp ?? null,
          nationality: dto.nationality ?? null,
          occupation: dto.occupation ?? null,
        },
      });

      const user = await tx.user.create({
        data: {
          organizationId: orgId,
          personId: person.id,
          email: dto.email,
          phoneE164: dto.phone,
          passwordHash,
          status: "ACTIVE",
          mustChangePassword: false,
        },
      });

      const patient = await tx.patient.create({
        data: {
          organizationId: orgId,
          userId: user.id,
          personId: person.id,
          mrn,
          preferredLanguage: "es-MX",
          consentPrivacyAt: new Date(),
        },
      });

      const patientRole = await tx.role.findFirst({
        where: { organizationId: orgId, code: "PATIENT" },
      });
      if (patientRole) {
        await tx.userRole.create({
          data: {
            organizationId: orgId,
            userId: user.id,
            roleId: patientRole.id,
            branchId,
          },
        });
      }

      return { user, person, patient };
    });

    this.logger.log(`Paciente registrado: ${result.user.id} (MRN: ${mrn})`);

    const tokens = await this.issueTokens({
      userId: result.user.id,
      email: result.user.email,
      organizationId: orgId,
      branchId,
      roles: ["PATIENT"],
      permissions: [],
    });

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: `${dto.firstName} ${dto.lastNameP}${dto.lastNameM ? " " + dto.lastNameM : ""}`,
        organizationId: orgId,
        branchId,
        roles: ["PATIENT"],
        permissions: [],
        mustChangePassword: false,
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessExpiresIn: this.accessExpiresInSeconds,
      },
    };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: { email },
      include: { person: true },
    });
    if (!user) {
      return { message: "Si el email existe, recibiras un enlace de recuperacion" };
    }

    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gte: new Date() } },
      data: { usedAt: new Date() },
    });

    const token = randomBytes(32).toString("hex");
    const tokenHash = await argonHash(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const fullName = user.person
      ? `${user.person.firstName} ${user.person.lastNameP}`
      : user.email;
    const resetUrl = `${this.config.get<string>("PORTAL_URL", "http://localhost:5173")}/reset-password?token=${token}`;
    const html = `<h2>Recuperacion de Contrasena</h2><p>Hola ${fullName},</p><p>Recibiste este correo porque solicitaste restablecer tu contrasena.</p><p>Haz clic en el siguiente enlace para crear una nueva contrasena:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Este enlace expira en 1 hora.</p><p>Si no solicitaste este cambio, ignora este mensaje.</p>`;

    await this.mail.send({ to: user.email, subject: "Recuperacion de Contrasena - MediControl", html });

    this.logger.log(`Password reset email sent to ${email}`);
    return { message: "Si el email existe, recibiras un enlace de recuperacion" };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const tokens = await this.prisma.passwordResetToken.findMany({
      where: { usedAt: null, expiresAt: { gte: new Date() } },
      include: { user: true },
    });

    let matched: typeof tokens[0] | null = null;
    for (const t of tokens) {
      const ok = await argonVerify(t.tokenHash, token);
      if (ok) { matched = t; break; }
    }

    if (!matched) throw new BadRequestException("Token invalido o expirado");

    const newHash = await argonHash(newPassword);
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: matched.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: matched.userId },
        data: { passwordHash: newHash, mustChangePassword: false },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: matched.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    this.logger.log(`Password reset complete for userId=${matched.userId}`);
    return { message: "Contrasena actualizada exitosamente" };
  }

  private async generateMrn(organizationId: string): Promise<string> {
    const lastPatient = await this.prisma.patient.findFirst({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      select: { mrn: true },
    });
    let nextNum = 1;
    if (lastPatient?.mrn) {
      const match = lastPatient.mrn.match(/(\d+)$/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    return `MCN-${String(nextNum).padStart(6, "0")}`;
  }
}
