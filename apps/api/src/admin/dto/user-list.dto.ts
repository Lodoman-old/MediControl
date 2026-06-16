import { ApiProperty } from "@nestjs/swagger";

export class UserListItemDto {
  @ApiProperty({ example: "cm2..." })
  id!: string;

  @ApiProperty({ example: "user@medicontrol.mx" })
  email!: string;

  @ApiProperty({ example: "Juan Perez" })
  fullName!: string;

  @ApiProperty({ example: ["DOCTOR"] })
  roles!: string[];

  @ApiProperty({ example: "ACTIVE" })
  status!: string;

  @ApiProperty({ example: false })
  mustChangePassword!: boolean;

  @ApiProperty({ example: null, nullable: true })
  branchId!: string | null;

  @ApiProperty({ example: null, nullable: true })
  branchName!: string | null;

  @ApiProperty({ example: "2025-01-15T00:00:00.000Z" })
  createdAt!: Date;

  @ApiProperty({ example: "2025-01-15T00:00:00.000Z" })
  lastLoginAt!: Date | null;

  @ApiProperty({ example: "GEN", nullable: true })
  specialtyCode!: string | null;

  @ApiProperty({ example: "12345678", nullable: true })
  cedulaProfesional!: string | null;
}

export class PaginatedUserListDto {
  @ApiProperty({ type: [UserListItemDto] })
  data!: UserListItemDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 3 })
  total!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;
}
