import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsUUID, IsOptional, IsEnum, IsArray, IsObject } from "class-validator";

export class CreateNotificationDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;

  @ApiProperty({ enum: ["IN_APP", "EMAIL", "WHATSAPP"] })
  @IsEnum(["IN_APP", "EMAIL", "WHATSAPP"])
  channel!: string;

  @ApiProperty({ example: "APPOINTMENT_REMINDER" })
  @IsString()
  type!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  message!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referenceType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referenceId?: string;
}

export class CreateNotificationTemplateDto {
  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: ["IN_APP", "EMAIL", "WHATSAPP"] })
  @IsEnum(["IN_APP", "EMAIL", "WHATSAPP"])
  channel!: string;

  @ApiProperty()
  @IsString()
  type!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty()
  @IsString()
  content!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  variables?: string[];
}

export class UpdateNotificationTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  variables?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  isActive?: string;
}

export class SendNotificationDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;

  @ApiProperty({ enum: ["EMAIL", "WHATSAPP"] })
  @IsEnum(["EMAIL", "WHATSAPP"])
  channel!: string;

  @ApiProperty()
  @IsString()
  templateCode!: string;

  @ApiProperty()
  @IsObject()
  variables!: Record<string, string>;
}

export class NotificationFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  limit?: string;
}
