import { ApiProperty } from "@nestjs/swagger";

export class MfaSetupResponseDto {
  @ApiProperty({ example: "JBSWY3DPEHPK3PXP" })
  secret!: string;

  @ApiProperty({ example: "otpauth://totp/MediControl:admin@medicontrol.mx?secret=...&issuer=MediControl" })
  uri!: string;
}
