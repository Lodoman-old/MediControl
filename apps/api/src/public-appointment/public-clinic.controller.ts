import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { PublicAppointmentService } from "./public-appointment.service";

@ApiTags("Portal Publico - Clinicas")
@Controller("public")
export class PublicClinicController {
  constructor(private readonly publicAppt: PublicAppointmentService) {}

  @Public()
  @ApiOperation({
    summary: "Listar clinicas publicas",
    description: "Lista las clinicas con al menos una sucursal activa para el portal de reservas.",
  })
  @Get("clinics")
  async listClinics() {
    return this.publicAppt.listPublicClinics();
  }
}
