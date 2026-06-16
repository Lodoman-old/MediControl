import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { MfaService } from "./mfa/mfa.service";
import { MfaController } from "./mfa/mfa.controller";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { JwtRefreshStrategy } from "./strategies/jwt-refresh.strategy";

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController, MfaController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy, MfaService],
  exports: [AuthService],
})
export class AuthModule {}
