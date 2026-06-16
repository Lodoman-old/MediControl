import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class RefreshDto {
  @ApiPropertyOptional({ example: "eyJhbGciOiJIUzI1NiIs..." })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
