import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsDateString, IsIn, IsUUID, MinLength } from "class-validator";

export class PublicBookAppointmentDto {
  @ApiPropertyOptional({ description: "ID de la organizacion (alternativa a slug)" })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ description: "Slug publico de la organizacion (alternativa a organizationId)" })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ description: "ID del medico" })
  @IsUUID()
  doctorId!: string;

  @ApiProperty({ description: "ID del servicio" })
  @IsUUID()
  serviceId!: string;

  @ApiProperty({ description: "ID de la sucursal" })
  @IsUUID()
  branchId!: string;

  @ApiProperty({ description: "Fecha de la cita (YYYY-MM-DD)", example: "2026-10-15" })
  @IsDateString()
  date!: string;

  @ApiProperty({ description: "Hora de inicio (HH:MM)", example: "10:00" })
  @IsString()
  startTime!: string;

  @ApiPropertyOptional({ description: "Duracion en minutos (default: del servicio)" })
  @IsOptional()
  durationMin?: number;

  @ApiProperty({ description: "Nombre del paciente" })
  @IsString()
  @MinLength(1)
  firstName!: string;

  @ApiProperty({ description: "Apellido paterno" })
  @IsString()
  @MinLength(1)
  lastNameP!: string;

  @ApiPropertyOptional({ description: "Apellido materno" })
  @IsOptional()
  @IsString()
  lastNameM?: string;

  @ApiProperty({ description: "Telefono E.164", example: "+525512345678" })
  @IsString()
  @MinLength(10)
  phone!: string;

  @ApiProperty({ description: "Fecha nacimiento (YYYY-MM-DD)", example: "1990-01-15" })
  @IsDateString()
  birthDate!: string;

  @ApiProperty({ description: "Genero", enum: ["M", "F", "X"] })
  @IsString()
  @IsIn(["M", "F", "X"])
  gender!: string;

  @ApiPropertyOptional({ description: "CURP" })
  @IsOptional()
  @IsString()
  curp?: string;

  @ApiPropertyOptional({ description: "Motivo de la cita" })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: "ID de paciente existente (opcional)" })
  @IsOptional()
  @IsUUID()
  patientId?: string;
}

export class PublicAppointmentResponseDto {
  @ApiProperty()
  appointmentId!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  startsAt!: Date;

  @ApiProperty()
  endsAt!: Date;

  @ApiProperty()
  doctor!: string;

  @ApiProperty()
  service!: string;

  @ApiProperty()
  branch!: string;

  @ApiProperty()
  priceQuoted!: number;

  @ApiProperty()
  currency!: string;
}