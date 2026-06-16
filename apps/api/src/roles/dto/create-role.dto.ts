import { IsArray, IsOptional, IsString, Length } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateRoleDto {
  @ApiProperty({ example: "CAJERO" })
  @IsString() @Length(2, 40)
  code!: string;

  @ApiProperty({ example: "Cajero" })
  @IsString() @Length(2, 120)
  name!: string;

  @ApiProperty({ example: "Rol para cajeros de farmacia", required: false })
  @IsOptional() @IsString()
  description?: string;

  @ApiProperty({ example: ["pharmacy:medications:read"], required: false })
  @IsOptional() @IsArray() @IsString({ each: true })
  permissionCodes?: string[];
}
