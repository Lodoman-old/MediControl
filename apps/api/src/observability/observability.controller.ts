import { Controller, Get, Res } from "@nestjs/common";
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from "@nestjs/swagger";
import { register } from "prom-client";
import type { Response } from "express";
import { Public } from "../auth/decorators/public.decorator";
import { HealthService } from "./health.service";
import { MetricsService } from "./metrics.service";

@ApiTags("Observabilidad")
@Controller()
export class ObservabilityController {
  constructor(
    private readonly health: HealthService,
    private readonly metrics: MetricsService,
  ) {}

  @Public()
  @ApiExcludeEndpoint()
  @Get("metrics")
  async getMetrics(@Res() res: Response) {
    const metrics = await this.metrics.getMetrics();
    res.set("Content-Type", register.contentType);
    res.end(metrics);
  }

  @Public()
  @ApiOperation({ summary: "Health check completo (DB, disco, memoria)" })
  @Get("health")
  async healthCheck() {
    return this.health.check();
  }

  @Public()
  @ApiOperation({ summary: "Liveness check rapido" })
  @Get("health/live")
  async liveness() {
    return this.health.checkLiveness();
  }

  @Public()
  @ApiOperation({ summary: "Informacion del sistema" })
  @Get("health/info")
  async systemInfo() {
    return this.health.getSystemInfo();
  }
}
