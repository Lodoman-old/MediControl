import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { RefreshTokenPayload } from "../types/jwt-payload.type";

export interface RefreshValidated {
  userId: string;
  jti: string;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  "jwt-refresh",
) {
  private static secretCache: string | null = null;

  constructor() {
    const secret =
      JwtRefreshStrategy.secretCache ?? process.env["JWT_REFRESH_SECRET"];
    if (!secret) {
      throw new Error("JWT_REFRESH_SECRET is not configured");
    }
    JwtRefreshStrategy.secretCache = secret;
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) =>
          (req?.cookies?.["refresh_token"] as string | undefined) ??
          (req?.body?.refreshToken as string | undefined) ??
          null,
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: RefreshTokenPayload): RefreshValidated {
    if (payload.type !== "refresh") {
      throw new UnauthorizedException("Refresh token invalido");
    }
    const token =
      (req.cookies?.["refresh_token"] as string | undefined) ??
      (req.body?.refreshToken as string | undefined);
    if (!token) {
      throw new UnauthorizedException("Refresh token no proporcionado");
    }
    return { userId: payload.sub, jti: payload.jti };
  }
}
