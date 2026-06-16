import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable, tap } from "rxjs";
import { PrismaService } from "../../prisma/prisma.service";
import { AccessAction } from "@prisma/client";
import type { AuthenticatedUser } from "../../auth/types/authenticated-user.type";
import type { Request } from "express";

export const AUDIT_KEY = "audit:action";
export const Audit = (action: AccessAction, resource: string): MethodDecorator => {
  return (
    target: object,
    key?: string | symbol,
    descriptor?: PropertyDescriptor,
  ) => {
    if (!descriptor || !key) return descriptor!;
    Reflect.defineMetadata(AUDIT_KEY, { action, resource }, descriptor.value);
    return descriptor;
  };
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const meta = this.reflector.get<{ action: AccessAction; resource: string } | undefined>(
      AUDIT_KEY,
      context.getHandler(),
    );
    if (!meta) return next.handle();

    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();

    return next.handle().pipe(
      tap({
        next: () => {
          void this.write(req, meta.action, meta.resource);
        },
        error: () => {
          void this.write(req, meta.action, meta.resource);
        },
      }),
    );
  }

  private async write(
    req: Request & { user?: AuthenticatedUser },
    action: AccessAction,
    resource: string,
  ): Promise<void> {
    const user = req.user;
    if (!user) return;
    try {
      await this.prisma.accessLog.create({
        data: {
          organizationId: user.organizationId,
          actorUserId: user.userId,
          action,
          resourceType: resource,
          resourceId:
            (req.params?.["id"] as string | undefined) ??
            (req.body?.id as string | undefined) ??
            null,
          ipAddress: req.ip ?? null,
          userAgent: req.headers["user-agent"] ?? null,
        },
      });
    } catch (e) {
      this.logger.error(
        `No se pudo escribir AccessLog: ${(e as Error).message}`,
      );
    }
  }
}
