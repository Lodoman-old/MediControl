import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsNumber, IsBoolean, IsEnum, IsArray, Min, ArrayNotEmpty } from "class-validator";
import type { PaymentMethod } from "@prisma/client";

export class CreateMedicationDto {
  @ApiProperty() @IsString() sku!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() barcode?: string;
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsString() presentation!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() activeIngredient?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() concentration?: string;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() requiresPrescription?: boolean;
  @ApiProperty() @IsNumber() price!: number;
  @ApiPropertyOptional({ default: "MXN" }) @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() familyId?: string;
}

export class UpdateMedicationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() barcode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() presentation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() activeIngredient?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() concentration?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresPrescription?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() price?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() familyId?: string;
}

export class CreateBatchDto {
  @ApiProperty() @IsString() medicationId!: string;
  @ApiProperty() @IsString() batchNumber!: string;
  @ApiProperty() @IsString() expiryDate!: string;
  @ApiProperty() @IsNumber() @Min(0) initialStock!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() costPrice?: number;
}

export class CreateStockMovementDto {
  @ApiProperty() @IsString() batchId!: string;
  @ApiProperty({ enum: ["IN", "OUT", "ADJUSTMENT"] }) @IsEnum(["IN", "OUT", "ADJUSTMENT"]) type!: "IN" | "OUT" | "ADJUSTMENT";
  @ApiProperty() @IsNumber() @Min(1) quantity!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceId?: string;
}

export class CreateSaleDto {
  @ApiProperty() @IsString() branchId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() patientId?: string;
  @ApiProperty({ enum: ["CASH", "POS", "SPEI", "MERCADO_PAGO", "TRANSFER", "OTHER"] }) @IsEnum(["CASH", "POS", "SPEI", "MERCADO_PAGO", "TRANSFER", "OTHER"]) method!: PaymentMethod;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentReference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiProperty({ type: [Object] }) @IsArray() @ArrayNotEmpty() items!: Record<string, unknown>[];
}

export class CreateDispensingDto {
  @ApiProperty() @IsString() prescriptionId!: string;
  @ApiProperty() @IsString() medicationId!: string;
  @ApiProperty() @IsString() batchId!: string;
  @ApiProperty() @IsNumber() @Min(1) quantity!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() instructions?: string;
}

export class CreateAllergyDto {
  @ApiPropertyOptional() @IsOptional() @IsString() medicationId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() familyId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() groupId?: string;
  @ApiPropertyOptional({ default: "MODERATE" }) @IsOptional() @IsString() severity?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
