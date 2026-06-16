import { IsString, IsOptional, IsInt, IsNumber, Min, Max } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateAppointmentDto {
  @ApiProperty()
  @IsString()
  branchId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceLocationId?: string;

  @ApiProperty()
  @IsString()
  doctorId!: string;

  @ApiProperty()
  @IsString()
  patientId!: string;

  @ApiProperty()
  @IsString()
  serviceId!: string;

  @ApiProperty({ example: "2026-06-15T10:00:00.000Z" })
  @IsString()
  startsAt!: string;

  @ApiProperty({ example: "2026-06-15T10:30:00.000Z" })
  @IsString()
  endsAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ default: "IN_PERSON" })
  @IsString()
  channel!: string;

  @ApiProperty()
  @IsNumber()
  priceQuoted!: number;

  @ApiPropertyOptional({ default: "MXN" })
  @IsOptional()
  @IsString()
  currency?: string;
}

export class ConfirmAppointmentDto {
  @ApiProperty()
  @IsString()
  serviceLocationId!: string;
}

export class UpdateAppointmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceLocationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceId?: string;
}

export class AppointmentFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  doctorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  limit?: number;
}

export class TriageVitalsDto {
  @ApiPropertyOptional({ description: "Presion sistolica (mmHg)" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(300)
  bloodPressureSystolic?: number;

  @ApiPropertyOptional({ description: "Presion diastolica (mmHg)" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(200)
  bloodPressureDiastolic?: number;

  @ApiPropertyOptional({ description: "Frecuencia cardiaca (lpm)" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(300)
  heartRate?: number;

  @ApiPropertyOptional({ description: "Frecuencia respiratoria (rpm)" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  respiratoryRate?: number;

  @ApiPropertyOptional({ description: "Temperatura (°C)" })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(45)
  temperature?: number;

  @ApiPropertyOptional({ description: "Saturacion de oxigeno (%)" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  oxygenSaturation?: number;

  @ApiPropertyOptional({ description: "Peso (kg)" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(500)
  weight?: number;

  @ApiPropertyOptional({ description: "Talla (cm)" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(300)
  height?: number;

  @ApiPropertyOptional({ description: "Glucosa (mg/dL)" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(500)
  glucose?: number;

  @ApiPropertyOptional({ description: "Notas / observaciones" })
  @IsOptional()
  @IsString()
  notes?: string;
}
