import type { AccessTokenPayload } from "./jwt-payload.type";

export interface AuthenticatedUser {
  userId: string;
  email: string;
  organizationId: string;
  branchId: string | null;
  roles: string[];
  permissions: string[];
  raw: AccessTokenPayload;
}
