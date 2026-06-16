import { Module } from "@nestjs/common";
import { LabIntegrationController } from "./lab-integration.controller";
import { LabIntegrationService } from "./lab-integration.service";

@Module({
  controllers: [LabIntegrationController],
  providers: [LabIntegrationService],
  exports: [LabIntegrationService],
})
export class LabIntegrationModule {}
