import { IsArray, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateRoleDto {
  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsArray() @IsString({ each: true })
  permissionCodes?: string[];
}
