import { Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { PushModule } from "./push/push.module";
import { WebPushService } from "./web-push/web-push.service";

@Module({
  imports: [PushModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, WebPushService],
  exports: [NotificationsService, PushModule, WebPushService],
})
export class NotificationsModule {}
