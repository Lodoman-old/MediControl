import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsBoolean, IsOptional, IsArray } from "class-validator";

export class CreateReportScheduleDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty({ enum: ["revenue", "appointments", "patients", "doctors"] }) @IsString() reportType!: string;
  @ApiProperty() @IsString() cronExpression!: string;
  @ApiProperty() @IsArray() recipients!: string[];
  @ApiPropertyOptional({ default: "pdf" }) @IsOptional() @IsString() format?: string;
}

export class UpdateReportScheduleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cronExpression?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() recipients?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
