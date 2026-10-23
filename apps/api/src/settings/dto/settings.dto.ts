import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEmail, IsObject, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateOrganizationSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255)
  legalName?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(13)
  rfc?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160)
  displayName?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ example: "#0EA5A4" }) @IsOptional() @IsString() @MaxLength(20)
  primaryColor?: string;

  @ApiPropertyOptional({ example: "#0F172A" }) @IsOptional() @IsString() @MaxLength(20)
  secondaryColor?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional() @IsOptional() @IsEmail()
  email?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200)
  website?: string;

  @ApiPropertyOptional({ example: "America/Mexico_City" }) @IsOptional() @IsString() @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({ description: "Datos fiscales (street, colonia, ciudad, estado, cp, pais)" })
  @IsOptional()
  @IsObject()
  fiscalAddress?: Record<string, string>;
}

export class UpdateIntegrationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ description: "Campos de configuracion; los secretos vacios conservan el valor actual." })
  @IsOptional()
  @IsObject()
  config?: Record<string, string | number | boolean>;
}
