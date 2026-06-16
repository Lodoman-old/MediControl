import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";
import type { RoleCode } from "../types/roles.types";
import type { AuthenticatedUser } from "../types/authenticated-user.type";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RoleCode[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    if (!user) throw new ForbiddenException("Sin usuario autenticado");

    const has = required.some((r) => user.roles.includes(r));
    if (!has) {
      throw new ForbiddenException(
        `Se requiere alguno de estos roles: ${required.join(", ")}`,
      );
    }
    return true;
  }
}
