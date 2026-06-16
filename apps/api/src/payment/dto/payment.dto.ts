import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsNumber, IsEnum } from "class-validator";
import type { PaymentMethod, PaymentStatus } from "@prisma/client";

export class CreatePaymentDto {
  @ApiProperty()
  @IsString()
  branchId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  appointmentId?: string;

  @ApiProperty()
  @IsString()
  patientId!: string;

  @ApiProperty()
  @IsNumber()
  amount!: number;

  @ApiPropertyOptional({ default: "MXN" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ enum: ["CASH", "POS", "SPEI", "MERCADO_PAGO", "TRANSFER", "OTHER"] })
  @IsEnum(["CASH", "POS", "SPEI", "MERCADO_PAGO", "TRANSFER", "OTHER"])
  method!: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePaymentStatusDto {
  @ApiProperty({ enum: ["PENDING", "COMPLETED", "FAILED", "REFUNDED", "CANCELLED"] })
  @IsEnum(["PENDING", "COMPLETED", "FAILED", "REFUNDED", "CANCELLED"])
  status!: PaymentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;
}

export class PaymentFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  appointmentId?: string;

  @ApiPropertyOptional({ enum: ["PENDING", "COMPLETED", "FAILED", "REFUNDED", "CANCELLED"] })
  @IsOptional()
  @IsEnum(["PENDING", "COMPLETED", "FAILED", "REFUNDED", "CANCELLED"])
  status?: PaymentStatus;

  @ApiPropertyOptional({ enum: ["CASH", "POS", "SPEI", "MERCADO_PAGO", "TRANSFER", "OTHER"] })
  @IsOptional()
  @IsEnum(["CASH", "POS", "SPEI", "MERCADO_PAGO", "TRANSFER", "OTHER"])
  method?: PaymentMethod;
}
