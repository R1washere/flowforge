import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const corsOrigins = (
    config.get<string>("API_CORS_ORIGIN") ?? "http://localhost:3200"
  )
    .split(",")
    .map((origin) => origin.trim());

  app.use(helmet());
  app.set("trust proxy", Number(config.get<string>("TRUST_PROXY_HOPS") ?? 0));
  app.setGlobalPrefix("api");
  app.enableCors({
    origin: corsOrigins,
    credentials: false,
  });
  app.use(
    "/api",
    rateLimit({
      windowMs: Number(
        config.get<string>("API_RATE_LIMIT_WINDOW_MS") ?? 60_000,
      ),
      limit: Number(config.get<string>("API_RATE_LIMIT_MAX") ?? 120),
      standardHeaders: "draft-8",
      legacyHeaders: false,
      skip: (request) => request.method === "GET" || request.method === "HEAD",
    }),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: true,
    }),
  );
  app.enableShutdownHooks();

  const port = Number(
    config.get<string>("PORT") ?? config.get<string>("API_PORT") ?? 4200,
  );
  await app.listen(port, "0.0.0.0");
}

void bootstrap();
