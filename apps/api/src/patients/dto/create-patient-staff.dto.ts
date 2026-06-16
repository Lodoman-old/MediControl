import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, MinLength, IsIn } from "class-validator";

export class CreatePatientByStaffDto {
  @ApiProperty({ example: "Juan" })
  @IsString()
  @MinLength(1)
  firstName!: string;

  @ApiProperty({ example: "Perez" })
  @IsString()
  @MinLength(1)
  lastNameP!: string;

  @ApiProperty({ example: "Lopez", required: false })
  @IsOptional()
  @IsString()
  lastNameM?: string;

  @ApiProperty({ example: "paciente@correo.com" })
  @IsEmail({}, { message: "Email invalido" })
  email!: string;

  @ApiProperty({ example: "+525511111111" })
  @IsString()
  phone!: string;

  @ApiProperty({ example: "Temporal123!" })
  @IsString()
  @MinLength(8, { message: "La contrasena debe tener al menos 8 caracteres" })
  password!: string;

  @ApiProperty({ example: "1990-01-15" })
  @IsString()
  birthDate!: string;

  @ApiProperty({ example: "M", enum: ["M", "F", "X"] })
  @IsString()
  @IsIn(["M", "F", "X"])
  gender!: string;

  @ApiProperty({ example: "PEPJ900115HDFLRN01", required: false })
  @IsOptional()
  @IsString()
  curp?: string;

  @ApiProperty({ example: "Mexicana", required: false })
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiProperty({ example: "Empleado", required: false })
  @IsOptional()
  @IsString()
  occupation?: string;
}
