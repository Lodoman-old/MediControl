import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, MinLength, IsOptional, IsIn, IsDateString } from "class-validator";

export class QuickCreatePatientDto {
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

  @ApiProperty({ example: "+525511111111" })
  @IsString()
  phone!: string;

  @ApiProperty({ example: "1990-01-15" })
  @IsDateString()
  birthDate!: string;

  @ApiProperty({ example: "M", enum: ["M", "F", "X"] })
  @IsString()
  @IsIn(["M", "F", "X"])
  gender!: string;
}
