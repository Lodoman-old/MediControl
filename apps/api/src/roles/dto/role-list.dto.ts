import { ApiProperty } from "@nestjs/swagger";

class PermissionDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() resource!: string;
  @ApiProperty() action!: string;
  @ApiProperty({ nullable: true }) description?: string | null;
}

export class RoleListItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true }) description?: string | null;
  @ApiProperty() isSystem!: boolean;
  @ApiProperty() permissions!: PermissionDto[];
  @ApiProperty() userCount!: number;
}

export class RoleListDto {
  @ApiProperty({ type: [RoleListItemDto] })
  data!: RoleListItemDto[];
}
