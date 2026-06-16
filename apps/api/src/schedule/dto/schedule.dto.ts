import { IsInt, IsOptional, IsString, IsUUID, Min, Max } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateScheduleDto {
  @ApiProperty({ example: "uuid" })
  @IsUUID()
  doctorId!: string;

  @ApiProperty({ example: 1, description: "0=Sun, 1=Mon, ..., 6=Sat" })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty({ example: "09:00" })
  @IsString()
  startTime!: string;

  @ApiProperty({ example: "18:00" })
  @IsString()
  endTime!: string;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @IsInt()
  @Min(5)
  slotDurationMin?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  maxPatients?: number;
}

export class UpdateScheduleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(5)
  slotDurationMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  maxPatients?: number;
}

export class ScheduleResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  doctorId!: string;

  @ApiProperty()
  serviceLocationId!: string | null;

  @ApiProperty()
  dayOfWeek!: number;

  @ApiProperty()
  startTime!: string;

  @ApiProperty()
  endTime!: string;

  @ApiProperty()
  slotDurationMin!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  maxPatients!: number | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class CreateScheduleExceptionDto {
  @ApiProperty()
  @IsUUID()
  doctorId!: string;

  @ApiProperty({ example: "2026-06-15" })
  @IsString()
  exceptionDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  isAvailable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateScheduleExceptionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  isAvailable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AvailableSlotDto {
  @ApiProperty()
  start!: string;

  @ApiProperty()
  end!: string;
}

export class AvailableSlotsQueryDto {
  @ApiProperty({ example: "2026-06-15" })
  @IsString()
  date!: string;

  @ApiProperty()
  @IsUUID()
  doctorId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  serviceLocationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(5)
  durationMin?: number;
}
