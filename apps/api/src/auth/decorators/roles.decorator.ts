import { SetMetadata } from "@nestjs/common";
import type { RoleCode } from "../types/roles.types";

export const ROLES_KEY = "roles";
export const Roles = (...roles: RoleCode[]): MethodDecorator =>
  SetMetadata(ROLES_KEY, roles);
