import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { Logger as PinoLogger } from "nestjs-pino";
import { AppModule } from "./app.module";
import { initSentry } from "./observability/sentry.init";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log", "debug"],
  });

  const configService = app.get(ConfigService);

  initSentry(configService);

  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.use(cookieParser());
  app.enableCors({
    origin: (origin, callback) => {
      const allowed = process.env.CORS_ORIGIN?.split(",").map((s) => s.trim()) ?? ["http://localhost:5173"];
      // Allow requests from Capacitor APK (null/file://), local dev servers, and configured origins
      if (
        !origin ||
        allowed.includes(origin) ||
        origin === "null" ||
        origin.startsWith("capacitor://") ||
        origin.startsWith("file://") ||
        origin.startsWith("http://localhost") ||
        origin.startsWith("https://localhost")
      ) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  });

  app.setGlobalPrefix("api/v1");

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("MediControl API")
    .setDescription("API REST para gestion clinica - NOM-004-SSA3-2012")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/v1/docs", app, document);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);

  const logger = new Logger("Bootstrap");
  logger.log(`MediControl API listening on http://localhost:${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/api/v1/docs`);
  logger.log(`Metrics: http://localhost:${port}/metrics`);
  logger.log(`Health: http://localhost:${port}/api/v1/health`);
}

bootstrap().catch((err) => {
  console.error("Fatal bootstrap error", err);
  process.exit(1);
});
