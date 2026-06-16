import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";

export class MfaVerifyDto {
  @ApiProperty({ example: "123456", description: "Codigo TOTP de 6 digitos de la app autenticadora" })
  @IsString()
  @Length(6, 6, { message: "El codigo debe tener exactamente 6 digitos" })
  code!: string;
}
