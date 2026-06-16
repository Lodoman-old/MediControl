import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly enableQueryLog: boolean;
  private readonly slowQueryThreshold: number;

  constructor(private readonly config: ConfigService) {
    super({
      log: [
        { emit: "event", level: "warn" },
        { emit: "event", level: "error" },
        { emit: "event", level: "info" },
      ],
    });

    this.enableQueryLog =
      config.get<string>("ENABLE_DB_QUERY_LOG") === "true";
    this.slowQueryThreshold =
      Number(config.get<string>("SLOW_QUERY_THRESHOLD_MS")) || 500;
  }

  async onModuleInit(): Promise<void> {
    if (this.enableQueryLog) {
      this.$on("info" as never, (event: { message?: string }) => {
        if (event?.message) this.logger.debug(event.message);
      });
    }

    this.$on("warn" as never, (event: { message?: string }) => {
      if (event?.message) this.logger.warn(event.message);
    });

    this.$on("error" as never, (event: { message?: string }) => {
      if (event?.message) this.logger.error(event.message);
    });

    this.$use(async (params, next) => {
      const start = performance.now();
      const result = await next(params);
      const duration = performance.now() - start;

      if (duration > this.slowQueryThreshold) {
        this.logger.warn(
          `Slow query (${duration.toFixed(2)}ms): ${params.model}.${params.action}`,
        );
      }

      return result;
    });

    await this.$connect();
    this.logger.log("Prisma connected to PostgreSQL");
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log("Prisma disconnected");
  }
}
