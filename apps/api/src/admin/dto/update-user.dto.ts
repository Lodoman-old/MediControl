import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsEmail, IsOptional, IsString } from "class-validator";
import type { RoleCode } from "../../auth/types/roles.types";

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail({}, { message: "Email invalido" })
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ required: false, enum: ["ACTIVE", "INVITED", "LOCKED", "DISABLED"] })
  @IsOptional()
  @IsString()
  status?: "ACTIVE" | "INVITED" | "LOCKED" | "DISABLED";

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: RoleCode[];

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  branchId?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  specialtyCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cedulaProfesional?: string;
}
