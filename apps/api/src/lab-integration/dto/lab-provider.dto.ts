import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsBoolean } from "class-validator";

export class CreateLabProviderDto {
  @ApiProperty()
  @IsString()
  providerCode!: string;

  @ApiProperty()
  @IsString()
  providerName!: string;

  @ApiProperty()
  @IsString()
  apiEndpoint!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  apiKeyEnc?: string;

  @ApiPropertyOptional({ default: {} })
  @IsOptional()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateLabProviderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  providerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  apiEndpoint?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  apiKeyEnc?: string;

  @ApiPropertyOptional()
  @IsOptional()
  config?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
