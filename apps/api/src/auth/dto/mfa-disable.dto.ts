import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length, MinLength } from "class-validator";

export class MfaDisableDto {
  @ApiProperty({ example: "Admin123!Demo", description: "Contrasena actual para confirmar la desactivacion" })
  @IsString()
  @MinLength(8, { message: "La contrasena debe tener al menos 8 caracteres" })
  password!: string;

  @ApiProperty({ example: "123456", description: "Codigo TOTP de 6 digitos" })
  @IsString()
  @Length(6, 6, { message: "El codigo debe tener exactamente 6 digitos" })
  code!: string;
}
