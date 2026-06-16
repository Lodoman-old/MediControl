export interface AccessTokenPayload {
  sub: string;
  email: string;
  orgId: string;
  branchId: string | null;
  roles: string[];
  permissions: string[];
  type: "access";
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: "refresh";
}
