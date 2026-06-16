import {
  Injectable,
  Logger,
  NestMiddleware,
} from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import type { AuthenticatedUser } from "../../auth/types/authenticated-user.type";

export interface TenantRequest extends Request {
  tenantContext?: {
    organizationId: string;
    branchId: string | null;
    userId: string;
  };
}

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantContextMiddleware.name);

  use(req: TenantRequest, _res: Response, next: NextFunction): void {
    const user = req.user as AuthenticatedUser | undefined;
    if (user) {
      req.tenantContext = {
        organizationId: user.organizationId,
        branchId: user.branchId,
        userId: user.userId,
      };
    }
    next();
  }
}
