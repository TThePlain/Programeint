import "reflect-metadata";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), "../../.env") });
config({ path: resolve(process.cwd(), ".env") });

import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import express from "express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { ApiExceptionFilter } from "./common/api-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });
  const logger = new Logger("Bootstrap");

  // Código de desafios/labs pode ser grande — limite generoso.
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true, limit: "2mb" }));

  app.setGlobalPrefix("api");
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  app.enableCors({
    origin: appUrl,
    credentials: true,
  });

  const swagger = new DocumentBuilder()
    .setTitle("Programeint API")
    .setDescription("Contratos reais da plataforma de formação adaptativa")
    .setVersion("0.1.0")
    .build();
  SwaggerModule.setup("api/docs", app, SwaggerModule.createDocument(app, swagger));

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port, "127.0.0.1");
  logger.log(`API em http://127.0.0.1:${port}/api/health`);
}

bootstrap();
