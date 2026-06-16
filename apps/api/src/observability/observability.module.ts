import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { ObservabilityController } from "./observability.controller";
import { MetricsService } from "./metrics.service";
import { HealthService } from "./health.service";
import { MetricsInterceptor } from "./metrics.interceptor";

@Module({
  imports: [
    TerminusModule.forRoot({
      errorLogStyle: "pretty",
      gracefulShutdownTimeoutMs: 1000,
    }),
  ],
  controllers: [ObservabilityController],
  providers: [MetricsService, HealthService, MetricsInterceptor],
  exports: [MetricsService, MetricsInterceptor],
})
export class ObservabilityModule {}
