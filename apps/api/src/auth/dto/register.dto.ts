import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsEmail, MinLength, MaxLength, IsOptional, IsEnum, Matches } from "class-validator";

export class RegisterPatientDto {
  @ApiProperty({ example: "Juan" })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  firstName!: string;

  @ApiProperty({ example: "Perez" })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  lastNameP!: string;

  @ApiPropertyOptional({ example: "Garcia" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  lastNameM?: string;

  @ApiProperty({ example: "paciente@correo.com" })
  @IsEmail({}, { message: "Email invalido" })
  email!: string;

  @ApiProperty({ example: "+525511111111" })
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, { message: "Telefono invalido. Formato: +525511111111" })
  phone!: string;

  @ApiProperty({ example: "Paciente123!" })
  @IsString()
  @MinLength(8, { message: "La contrasena debe tener al menos 8 caracteres" })
  @MaxLength(64)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}/, {
    message: "La contrasena debe tener mayuscula, minuscula, numero y caracter especial",
  })
  password!: string;

  @ApiProperty({ example: "1990-01-01" })
  @IsString()
  birthDate!: string;

  @ApiProperty({ enum: ["M", "F", "X"] })
  @IsEnum(["M", "F", "X"])
  gender!: string;

  @ApiPropertyOptional({ example: "HELO850101HDFRRN01" })
  @IsOptional()
  @IsString()
  curp?: string;

  @ApiPropertyOptional({ example: "Mexicana" })
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiPropertyOptional({ example: "Empleado" })
  @IsOptional()
  @IsString()
  occupation?: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: "paciente@correo.com" })
  @IsEmail({}, { message: "Email invalido" })
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: "Token recibido por email" })
  @IsString()
  token!: string;

  @ApiProperty({ example: "NuevaPass123!" })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}/, {
    message: "La contrasena debe tener mayuscula, minuscula, numero y caracter especial",
  })
  newPassword!: string;
}

export class UpdatePatientProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  lastNameP?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  lastNameM?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, { message: "Telefono invalido. Formato: +525511111111" })
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bloodType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preferredLanguage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  occupation?: string;
}
