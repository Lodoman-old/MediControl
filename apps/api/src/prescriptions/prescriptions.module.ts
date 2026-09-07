import { Module } from "@nestjs/common";
import { PrescriptionsController } from "./prescriptions.controller";
import { PrescriptionsService } from "./prescriptions.service";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService],
})
export class PrescriptionsModule {}
