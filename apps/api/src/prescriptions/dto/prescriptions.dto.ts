import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsInt, IsIn, Min, Max } from "class-validator";

export class CreatePrescriptionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  medicalRecordId?: string;

  @ApiProperty()
  @IsString()
  patientId!: string;

  @ApiProperty()
  @IsString()
  medication!: string;

  @ApiProperty()
  @IsString()
  dosage!: string;

  @ApiProperty()
  @IsString()
  frequency!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  duration?: string;

  @ApiPropertyOptional({ default: "ORAL" })
  @IsOptional()
  @IsString()
  route?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  refills?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  indications?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class SignPrescriptionDto {
  @ApiProperty({ description: "Firma digital en base64" })
  @IsString()
  signature!: string;

  @ApiPropertyOptional({ description: "Tipo de firma (draw, typed, biometric)" })
  @IsOptional()
  @IsString()
  signatureType?: string;
}

export class UpdatePrescriptionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  medication?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dosage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  frequency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  duration?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  route?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  refills?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  indications?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ enum: ["ACTIVE", "COMPLETED", "CANCELLED"] })
  @IsOptional()
  @IsIn(["ACTIVE", "COMPLETED", "CANCELLED"])
  status?: "ACTIVE" | "COMPLETED" | "CANCELLED";
}
