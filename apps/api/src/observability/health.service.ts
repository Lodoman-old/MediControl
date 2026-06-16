import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  HealthCheckService as TerminusHealthCheck,
  PrismaHealthIndicator,
  DiskHealthIndicator,
  MemoryHealthIndicator,
} from "@nestjs/terminus";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly health: TerminusHealthCheck,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async check() {
    return this.health.check([
      () => this.prismaHealth.pingCheck("database", this.prisma),
      () => this.disk.checkStorage("storage", { thresholdPercent: 0.9, path: "/" }),
      () => this.memory.checkHeap("memory_heap", 300 * 1024 * 1024),
      () => this.memory.checkRSS("memory_rss", 300 * 1024 * 1024),
    ]);
  }

  async checkLiveness() {
    return this.health.check([
      () => this.prismaHealth.pingCheck("database", this.prisma),
    ]);
  }

  async getSystemInfo() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    return {
      uptime: process.uptime(),
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      env: this.config.get<string>("NODE_ENV") ?? "development",
    };
  }
}
