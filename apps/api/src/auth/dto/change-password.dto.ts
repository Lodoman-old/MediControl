import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength, MaxLength, Matches } from "class-validator";

export class ChangePasswordDto {
  @ApiProperty({ example: "Admin123!Demo", description: "Contrasena actual" })
  @IsString()
  currentPassword!: string;

  @ApiProperty({
    example: "NewSecurePass123!",
    description: "Nueva contrasena (min 8, mayus, minus, numero, especial)",
  })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^_~\-+=\[\]{}|:;<>.,?\/])[A-Za-z\d@$!%*?&#^_~\-+=\[\]{}|:;<>.,?\/]+$/,
    { message: "La contrasena debe tener mayuscula, minuscula, numero y caracter especial" },
  )
  newPassword!: string;
}
