import { Module } from "@nestjs/common";
import { PublicAppointmentController } from "./public-appointment.controller";
import { PublicAppointmentService } from "./public-appointment.service";

@Module({
  controllers: [PublicAppointmentController],
  providers: [PublicAppointmentService],
})
export class PublicAppointmentModule {}