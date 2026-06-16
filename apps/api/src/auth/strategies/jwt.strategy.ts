import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { Request } from "express";
import type { AccessTokenPayload } from "../types/jwt-payload.type";
import type { AuthenticatedUser } from "../types/authenticated-user.type";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  private static secretCache: string | null = null;

  constructor() {
    const secret =
      JwtStrategy.secretCache ?? process.env["JWT_ACCESS_SECRET"];
    if (!secret) {
      throw new Error("JWT_ACCESS_SECRET is not configured");
    }
    JwtStrategy.secretCache = secret;
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  validate(
    _req: Request,
    payload: AccessTokenPayload,
  ): AuthenticatedUser {
    if (payload.type !== "access") {
      throw new UnauthorizedException("Token invalido");
    }
    return {
      userId: payload.sub,
      email: payload.email,
      organizationId: payload.orgId,
      branchId: payload.branchId,
      roles: payload.roles,
      permissions: payload.permissions,
      raw: payload,
    };
  }
}
