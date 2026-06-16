import { ApiProperty } from "@nestjs/swagger";

export class TokenPairDto {
  @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIs..." })
  accessToken!: string;

  @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIs..." })
  refreshToken!: string;

  @ApiProperty({ example: 900 })
  accessExpiresIn!: number;
}

export class LoginResponseUser {
  @ApiProperty({ example: "cm2..." })
  id!: string;

  @ApiProperty({ example: "admin@medicontrol.mx" })
  email!: string;

  @ApiProperty({ example: "Admin MediControl" })
  fullName!: string;

  @ApiProperty({ example: "org_001" })
  organizationId!: string;

  @ApiProperty({ example: "branch_001", nullable: true })
  branchId!: string | null;

  @ApiProperty({ example: ["ADMIN"] })
  roles!: string[];

  @ApiProperty({ example: ["user:read", "user:write"] })
  permissions!: string[];

  @ApiProperty({ example: false })
  mustChangePassword!: boolean;
}

export class LoginResponseDto {
  @ApiProperty({ type: LoginResponseUser })
  user!: LoginResponseUser;

  @ApiProperty({ type: TokenPairDto })
  tokens!: TokenPairDto;

  @ApiProperty({ example: true, description: "Indica si se requiere MFA para completar el login", required: false })
  mfaRequired?: boolean;

  @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIs...", description: "Token temporal para completar el flujo MFA (solo cuando mfaRequired=true)", required: false })
  mfaToken?: string;
}

export class MeResponseDto {
  @ApiProperty({ example: "cm2..." })
  id!: string;

  @ApiProperty({ example: "admin@medicontrol.mx" })
  email!: string;

  @ApiProperty({ example: "Admin MediControl" })
  fullName!: string;

  @ApiProperty({ example: "org_001" })
  organizationId!: string;

  @ApiProperty({ example: "branch_001", nullable: true })
  branchId!: string | null;

  @ApiProperty({ example: ["ADMIN"] })
  roles!: string[];

  @ApiProperty({ example: ["user:read", "user:write"] })
  permissions!: string[];

  @ApiProperty({ example: false })
  mustChangePassword!: boolean;
}
