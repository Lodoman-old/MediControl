import { Global, Module } from "@nestjs/common";
import { SettingsService } from "./settings.service";
import { SettingsController } from "./settings.controller";
import { BrandingController } from "./branding.controller";
import { IntegrationsService } from "./integrations.service";

@Global()
@Module({
  controllers: [SettingsController, BrandingController],
  providers: [SettingsService, IntegrationsService],
  exports: [SettingsService, IntegrationsService],
})
export class SettingsModule {}
