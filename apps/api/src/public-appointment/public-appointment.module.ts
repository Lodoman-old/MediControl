import { Module } from "@nestjs/common";
import { PublicAppointmentController } from "./public-appointment.controller";
import { PublicClinicController } from "./public-clinic.controller";
import { PublicAppointmentService } from "./public-appointment.service";

@Module({
  controllers: [PublicAppointmentController, PublicClinicController],
  providers: [PublicAppointmentService],
})
export class PublicAppointmentModule {}
