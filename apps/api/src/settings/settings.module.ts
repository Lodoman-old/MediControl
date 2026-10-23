import { Global, Module } from "@nestjs/common";
import { SettingsService } from "./settings.service";
import { SettingsController } from "./settings.controller";
import { IntegrationsService } from "./integrations.service";

@Global()
@Module({
  controllers: [SettingsController],
  providers: [SettingsService, IntegrationsService],
  exports: [SettingsService, IntegrationsService],
})
export class SettingsModule {}
