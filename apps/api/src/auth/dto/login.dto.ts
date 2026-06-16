import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "admin@medicontrol.mx", description: "Correo del usuario" })
  @IsEmail({}, { message: "Email invalido" })
  email!: string;

  @ApiProperty({ example: "Admin123!Demo", description: "Contrasena del usuario" })
  @IsString()
  @MinLength(8, { message: "La contrasena debe tener al menos 8 caracteres" })
  password!: string;
}
