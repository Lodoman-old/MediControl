import { Module } from "@nestjs/common";
import { ServicesController } from "./services.controller";
import { ServiceLocationsController } from "./service-locations.controller";

@Module({
  controllers: [ServicesController, ServiceLocationsController],
})
export class ServicesModule {}
