import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class ResetPasswordDto {
  @ApiProperty({ example: "NuevaTemp123!", description: "Nueva contrasena temporal" })
  @IsString()
  @MinLength(8, { message: "La contrasena debe tener al menos 8 caracteres" })
  newPassword!: string;
}
