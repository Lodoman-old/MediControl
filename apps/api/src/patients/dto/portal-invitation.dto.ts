import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional } from "class-validator";

export class PortalInvitationDto {
  @ApiPropertyOptional({
    description: "Correo del paciente. Requerido si aun no tiene un correo real registrado.",
    example: "paciente@correo.com",
  })
  @IsOptional()
  @IsEmail({}, { message: "Email invalido" })
  email?: string;
}
