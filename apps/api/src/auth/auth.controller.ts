import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiConflictResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { RegisterPatientDto, ForgotPasswordDto, ResetPasswordDto } from "./dto/register.dto";
import {
  LoginResponseDto,
  MeResponseDto,
} from "./dto/auth-response.dto";
import { Public } from "./decorators/public.decorator";
import { CurrentUser } from "./decorators/current-user.decorator";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { JwtRefreshGuard } from "./guards/jwt-refresh.guard";
import type { AuthenticatedUser } from "./types/authenticated-user.type";
import type { RefreshValidated } from "./strategies/jwt-refresh.strategy";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @ApiOperation({ summary: "Iniciar sesion", description: "Autentica credenciales y devuelve tokens + perfil. Si el usuario tiene MFA habilitado, devuelve mfaRequired=true y un mfaToken." })
  @ApiOkResponse({ type: LoginResponseDto, description: "Login exitoso" })
  @ApiUnauthorizedResponse({ description: "Credenciales invalidas" })
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const result = await this.auth.login(
      dto.email,
      dto.password,
      req.headers["user-agent"],
      req.ip,
    );

    if (!("mfaRequired" in result && result.mfaRequired)) {
      res.cookie(
        this.auth.getRefreshCookieName(),
        result.tokens!.refreshToken,
        this.auth.getRefreshCookieOptions(),
      );
    }

    return result;
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @ApiOperation({ summary: "Renovar tokens", description: "Intercambia refresh token por un nuevo par" })
  @ApiOkResponse({ type: LoginResponseDto, description: "Tokens renovados" })
  @ApiUnauthorizedResponse({ description: "Refresh token invalido/expirado" })
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() _dto: RefreshDto,
  ): Promise<LoginResponseDto> {
    const validated = req.user as unknown as RefreshValidated;
    const refreshToken =
      (req.cookies?.["refresh_token"] as string | undefined) ??
      (req.body?.refreshToken as string | undefined);

    const result = await this.auth.refresh({
      userId: validated.userId,
      jti: validated.jti,
      refreshToken,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });

    res.cookie(
      this.auth.getRefreshCookieName(),
      result.tokens.refreshToken,
      this.auth.getRefreshCookieOptions(),
    );

    return result;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Cerrar sesion", description: "Invalida refresh token activo" })
  @ApiNoContentResponse({ description: "Sesion cerrada" })
  @ApiUnauthorizedResponse({ description: "Token de acceso invalido" })
  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const refreshToken =
      (req.cookies?.["refresh_token"] as string | undefined) ??
      (req.body?.refreshToken as string | undefined);
    let jti: string | undefined;
    if (refreshToken) {
      try {
        const decoded = JSON.parse(
          Buffer.from(refreshToken.split(".")[1] ?? "", "base64").toString(),
        );
        jti = decoded?.jti;
      } catch {
        // ignore
      }
    }
    await this.auth.logout(user.userId, jti);
    res.clearCookie(this.auth.getRefreshCookieName(), {
      path: "/",
    });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Perfil actual", description: "Devuelve datos del usuario autenticado" })
  @ApiOkResponse({ type: MeResponseDto, description: "Datos del usuario" })
  @ApiUnauthorizedResponse({ description: "Token de acceso invalido" })
  @Get("me")
  async me(@CurrentUser() user: AuthenticatedUser): Promise<MeResponseDto> {
    return this.auth.me(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Cambiar contrasena", description: "Cambia la contrasena del usuario autenticado. Si mustChangePassword era true, pasa a false." })
  @ApiOkResponse({ description: "Contrasena actualizada" })
  @ApiBadRequestResponse({ description: "Contrasena actual incorrecta o nueva invalida" })
  @ApiUnauthorizedResponse({ description: "Token de acceso invalido" })
  @Post("change-password")
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.auth.changePassword(user.userId, dto.currentPassword, dto.newPassword);
  }

  @Public()
  @ApiOperation({ summary: "Registro de paciente", description: "Auto-registro para nuevos pacientes. Crea persona, usuario y expediente en una transaccion." })
  @ApiConflictResponse({ description: "El email ya esta registrado" })
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterPatientDto): Promise<LoginResponseDto> {
    return this.auth.register(dto);
  }

  @Public()
  @ApiOperation({ summary: "Solicitar recuperacion de contrasena", description: "Envia un enlace de recuperacion al correo del usuario." })
  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    return this.auth.forgotPassword(dto.email);
  }

  @Public()
  @ApiOperation({ summary: "Restablecer contrasena", description: "Restablece la contrasena usando un token recibido por email." })
  @ApiBadRequestResponse({ description: "Token invalido o expirado" })
  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    return this.auth.resetPassword(dto.token, dto.newPassword);
  }
}
