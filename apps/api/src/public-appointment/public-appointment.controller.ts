import { Controller, Post, Body, Get, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { PublicAppointmentService } from "./public-appointment.service";
import { PublicBookAppointmentDto, PublicAppointmentResponseDto } from "./dto/public-appointment.dto";
import { BadRequestException } from "@nestjs/common";

@ApiTags("Portal Público - Citas")
@Controller("public/appointments")
export class PublicAppointmentController {
  constructor(private readonly publicAppt: PublicAppointmentService) {}

  @Public()
  @ApiOperation({ summary: "Reservar cita pública", description: "Crea una cita sin autenticación. Requiere organizationId o slug." })
  @Post()
  async book(@Body() dto: PublicBookAppointmentDto): Promise<PublicAppointmentResponseDto> {
    const orgId = dto.organizationId ?? (await this.publicAppt.getOrgIdBySlug(dto.slug));
    if (!orgId) throw new BadRequestException("organizationId o slug requerido");
    return this.publicAppt.bookPublicAppointment(orgId, dto);
  }

  @Public()
  @ApiOperation({ summary: "Verificar disponibilidad pública", description: "Verifica si hay disponibilidad para un medico, fecha y servicio." })
  @Get("check-availability")
  async checkAvailability(
    @Query("organizationId") organizationId: string,
    @Query("slug") slug: string,
    @Query("doctorId") doctorId: string,
    @Query("date") date: string,
    @Query("serviceId") serviceId: string,
  ) {
    const orgId = organizationId ?? (await this.publicAppt.getOrgIdBySlug(slug));
    if (!orgId) throw new BadRequestException("organizationId o slug requerido");
    return this.publicAppt.checkAvailability(orgId, doctorId, date, serviceId);
  }
}