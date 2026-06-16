import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsUUID, IsOptional, IsNumber } from "class-validator";

export class SelfScheduleDto {
  @ApiProperty()
  @IsUUID()
  doctorId!: string;

  @ApiProperty()
  @IsUUID()
  serviceId!: string;

  @ApiProperty()
  @IsUUID()
  branchId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  serviceLocationId?: string;

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
}
