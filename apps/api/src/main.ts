import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { fileURLToPath } from 'node:url';
import { AppModule } from './app.module.js';
import { parseRuntimeConfig } from './config/runtime-config.js';

export async function createApiApplication(): Promise<NestFastifyApplication> {
  const config = parseRuntimeConfig(process.env);
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: config.isProduction }),
    { bufferLogs: true },
  );

  await app.register(helmet, { contentSecurityPolicy: config.isProduction });
  await app.register(rateLimit, { global: true, max: 120, timeWindow: '1 minute' });
  app.enableCors({
    origin: config.corsOrigins.length === 0 ? false : [...config.corsOrigins],
    credentials: false,
    methods: ['GET', 'HEAD', 'POST'],
  });
  app.setGlobalPrefix('v1');
  app.enableShutdownHooks();
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    disableErrorMessages: config.isProduction,
  }));

  const document = SwaggerModule.createDocument(app, new DocumentBuilder()
    .setTitle('CloudPrint CM API')
    .setDescription('Private print queue API. Provider endpoints are introduced only after integration verification.')
    .setVersion('0.1.0')
    .build());
  SwaggerModule.setup('v1/docs', app, document, { jsonDocumentUrl: 'v1/openapi.json' });
  return app;
}

export async function bootstrap(): Promise<void> {
  const config = parseRuntimeConfig(process.env);
  const app = await createApiApplication();
  await app.listen({ port: config.port, host: config.host });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await bootstrap();
}
