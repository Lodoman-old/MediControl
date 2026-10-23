import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";

export class BranchAddressDto {
  @ApiPropertyOptional({ example: "Av. Reforma 222" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  street?: string;

  @ApiPropertyOptional({ example: "Juarez" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  colonia?: string;

  @ApiPropertyOptional({ example: "Ciudad de Mexico" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  ciudad?: string;

  @ApiPropertyOptional({ example: "CDMX" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  estado?: string;

  @ApiPropertyOptional({ example: "06600" })
  @IsOptional()
  @IsString()
  @MaxLength(12)
  cp?: string;

  @ApiPropertyOptional({ example: "Mexico" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  pais?: string;
}

export class CreateBranchDto {
  @ApiProperty({ example: "CENTRO" })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  code!: string;

  @ApiProperty({ example: "Sucursal Centro" })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ type: BranchAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BranchAddressDto)
  address?: BranchAddressDto;

  @ApiPropertyOptional({ example: "+525512345678" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: "COFEPRIS-123" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  cofeprisLicense?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateBranchDto extends PartialType(CreateBranchDto) {}
