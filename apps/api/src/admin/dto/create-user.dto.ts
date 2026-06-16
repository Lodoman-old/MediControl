import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, IsArray, MinLength } from "class-validator";
import type { RoleCode } from "../../auth/types/roles.types";

export class CreateUserDto {
  @ApiProperty({ example: "nuevo@medicontrol.mx" })
  @IsEmail({}, { message: "Email invalido" })
  email!: string;

  @ApiProperty({ example: "Nuevo Usuario" })
  @IsString()
  @MinLength(1)
  fullName!: string;

  @ApiProperty({ example: "Temporal123!", description: "Contrasena temporal del usuario" })
  @IsString()
  @MinLength(8, { message: "La contrasena debe tener al menos 8 caracteres" })
  password!: string;

  @ApiProperty({ example: ["DOCTOR"], description: "Roles a asignar" })
  @IsArray()
  @IsString({ each: true })
  roles!: RoleCode[];

  @ApiProperty({ example: null, description: "ID de la sucursal (opcional)", required: false, nullable: true })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiProperty({ example: "GEN", description: "Codigo de especialidad (requerido si rol DOCTOR)", required: false })
  @IsOptional()
  @IsString()
  specialtyCode?: string;

  @ApiProperty({ example: "12345678", description: "Cedula profesional (requerido si rol DOCTOR)", required: false })
  @IsOptional()
  @IsString()
  cedulaProfesional?: string;
}
