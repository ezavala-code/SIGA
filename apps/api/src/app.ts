import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module.js';
import type { Environment } from './config/environment.js';
import { allowedOrigin } from './config/origin.js';

export async function createApp(environment: Environment, quiet = false) {
  const app = await NestFactory.create(AppModule.register(environment), {
    logger: quiet ? false : ['log', 'warn', 'error'],
    abortOnError: false,
  });
  app.use(helmet());
  app.use('/auth', (_request: Request, response: Response, next: NextFunction) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => callback(null, !origin || allowedOrigin(origin, environment)),
    credentials: true,
  });
  app.enableShutdownHooks();
  return app;
}
