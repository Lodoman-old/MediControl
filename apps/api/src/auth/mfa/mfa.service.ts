import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as otplib from "otplib";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);
  private readonly encryptionKey: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    const raw = config.get<string>("MFA_ENCRYPTION_KEY");
    if (!raw || raw.length < 32) {
      throw new Error("MFA_ENCRYPTION_KEY must be at least 32 characters");
    }
    this.encryptionKey = scryptSync(raw, "medicontrol-mfa-salt", 32);
  }

  async setup(userId: string): Promise<{ secret: string; uri: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    if (user.mfaEnabled) {
      throw new ConflictException("MFA ya esta habilitado");
    }

    const secret = otplib.generateSecret();
    const serviceName = "MediControl";
    const uri = otplib.generateURI({ strategy: "totp", issuer: serviceName, label: user.email, secret });

    const encrypted = this.encrypt(secret);
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecretEnc: encrypted },
    });

    return { secret, uri };
  }

  async verify(userId: string, code: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    if (user.mfaEnabled) {
      throw new ConflictException("MFA ya esta habilitado");
    }

    if (!user.mfaSecretEnc) {
      throw new BadRequestException(
        "Primero debes generar la configuracion MFA",
      );
    }

    const secret = this.decrypt(user.mfaSecretEnc);
    const result = await otplib.verify({ token: code, secret });

    if (!result.valid) {
      throw new BadRequestException("Codigo TOTP invalido");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true },
    });
  }

  async disable(
    userId: string,
    password: string,
    code: string,
  ): Promise<void> {
    const { verify: argonVerify } = await import("@node-rs/argon2");
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    if (!user.mfaEnabled) {
      throw new BadRequestException("MFA no esta habilitado");
    }

    const ok = user.passwordHash
      ? await argonVerify(user.passwordHash, password)
      : false;
    if (!ok) {
      throw new BadRequestException("Contrasena incorrecta");
    }

    if (!user.mfaSecretEnc) {
      throw new BadRequestException("No hay secreto MFA configurado");
    }

    const secret = this.decrypt(user.mfaSecretEnc);
    const result = await otplib.verify({ token: code, secret });

    if (!result.valid) {
      throw new BadRequestException("Codigo TOTP invalido");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecretEnc: null, mfaEnabled: false },
    });
  }

  async validateMfaLogin(
    mfaToken: string,
    code: string,
    userAgent?: string,
    ip?: string,
  ): Promise<{
    userId: string;
    email: string;
  }> {
    const payload = await this.jwt
      .verifyAsync<{ sub: string; email: string; type: string }>(mfaToken, {
        secret: process.env["JWT_ACCESS_SECRET"],
      })
      .catch(() => {
        throw new UnauthorizedException("MFA token invalido o expirado");
      });

    if (payload.type !== "mfa") {
      throw new UnauthorizedException("MFA token invalido");
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: payload.sub },
    });

    if (user.status !== "ACTIVE") {
      throw new UnauthorizedException("Usuario inactivo");
    }

    if (!user.mfaEnabled || !user.mfaSecretEnc) {
      throw new BadRequestException("MFA no esta habilitado para este usuario");
    }

    const secret = this.decrypt(user.mfaSecretEnc);
    const result = await otplib.verify({ token: code, secret });

    if (!result.valid) {
      throw new BadRequestException("Codigo TOTP invalido");
    }

    return { userId: user.id, email: user.email };
  }

  generateMfaToken(userId: string, email: string): Promise<string> {
    return this.jwt.signAsync(
      { sub: userId, email, type: "mfa" },
      {
        secret: process.env["JWT_ACCESS_SECRET"],
        expiresIn: "5m",
      },
    );
  }

  private encrypt(plaintext: string): Buffer {
    const iv = randomBytes(16);
    const cipher = createCipheriv("aes-256-gcm", this.encryptionKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]);
  }

  private decrypt(data: Buffer): string {
    const iv = data.subarray(0, 16);
    const tag = data.subarray(16, 32);
    const encrypted = data.subarray(32);
    const decipher = createDecipheriv("aes-256-gcm", this.encryptionKey, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final("utf8");
  }
}
