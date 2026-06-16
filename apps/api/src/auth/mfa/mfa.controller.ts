import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { Request, Response } from "express";
import { AuthService } from "../auth.service";
import { MfaDisableDto } from "../dto/mfa-disable.dto";
import { MfaSetupResponseDto } from "../dto/mfa-setup-response.dto";
import { MfaVerifyDto } from "../dto/mfa-verify.dto";
import { MfaVerifyLoginDto } from "../dto/mfa-verify-login.dto";
import { LoginResponseDto } from "../dto/auth-response.dto";
import { CurrentUser } from "../decorators/current-user.decorator";
import { Public } from "../decorators/public.decorator";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import type { AuthenticatedUser } from "../types/authenticated-user.type";
import { MfaService } from "./mfa.service";

@ApiTags("MFA")
@Controller("auth/mfa")
export class MfaController {
  constructor(
    private readonly mfa: MfaService,
    private readonly auth: AuthService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Configurar MFA", description: "Genera un secreto TOTP y una URI para configurar la app autenticadora. Requiere autenticacion." })
  @ApiOkResponse({ type: MfaSetupResponseDto, description: "Secreto y URI generados" })
  @ApiConflictResponse({ description: "MFA ya esta habilitado" })
  @ApiUnauthorizedResponse({ description: "Token de acceso invalido" })
  @Post("setup")
  @HttpCode(HttpStatus.OK)
  async setup(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MfaSetupResponseDto> {
    return this.mfa.setup(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Verificar y habilitar MFA", description: "Verifica un codigo TOTP contra el secreto generado en setup y habilita MFA." })
  @ApiOkResponse({ description: "MFA habilitado exitosamente" })
  @ApiBadRequestResponse({ description: "Codigo TOTP invalido o setup no realizado" })
  @ApiConflictResponse({ description: "MFA ya esta habilitado" })
  @ApiUnauthorizedResponse({ description: "Token de acceso invalido" })
  @Post("verify")
  @HttpCode(HttpStatus.OK)
  async verify(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MfaVerifyDto,
  ): Promise<void> {
    await this.mfa.verify(user.userId, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Deshabilitar MFA", description: "Deshabilita MFA. Requiere contrasena actual y codigo TOTP." })
  @ApiOkResponse({ description: "MFA deshabilitado" })
  @ApiBadRequestResponse({ description: "Contrasena incorrecta, codigo invalido, o MFA no habilitado" })
  @ApiUnauthorizedResponse({ description: "Token de acceso invalido" })
  @Post("disable")
  @HttpCode(HttpStatus.OK)
  async disable(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MfaDisableDto,
  ): Promise<void> {
    await this.mfa.disable(user.userId, dto.password, dto.code);
  }

  @Public()
  @ApiOperation({ summary: "Verificar MFA en login", description: "Completa el login enviando el mfaToken (obtenido en login cuando mfaRequired=true) y un codigo TOTP." })
  @ApiOkResponse({ type: LoginResponseDto, description: "Login MFA completado" })
  @ApiBadRequestResponse({ description: "Codigo TOTP invalido" })
  @ApiUnauthorizedResponse({ description: "MFA token invalido o expirado" })
  @Post("verify-login")
  @HttpCode(HttpStatus.OK)
  async verifyLogin(
    @Body() dto: MfaVerifyLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const { userId } = await this.mfa.validateMfaLogin(
      dto.mfaToken,
      dto.code,
      req.headers["user-agent"],
      req.ip,
    );

    const user = await this.auth.me(userId);
    const tokens = await this.auth.issueUserTokens({
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId,
      branchId: user.branchId,
      roles: user.roles,
      permissions: user.permissions,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });

    res.cookie(
      this.auth.getRefreshCookieName(),
      tokens.refreshToken,
      this.auth.getRefreshCookieOptions(),
    );

    return {
      user,
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessExpiresIn: tokens.accessExpiresIn,
      },
    };
  }
}
