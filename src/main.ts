import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SentryInterceptor } from '@ntegral/nestjs-sentry';
import { GlobalExceptionFilter, RpcGlobalExceptionInterceptor } from './common';
import * as bodyParser from 'body-parser';
import { Logger } from 'nestjs-pino';
import { IApiOptions, ICoreApiConfig } from './configuration';
import { SeedingService } from './infrastructure/persistence/seeds';
import { AppModule } from './app.module';

const PCKG_VERSION = process.env.npm_package_version || '1.0.0';
const PCKG_NAME = process.env.npm_package_name || 'ERP-Core-APIs';
const GLOBAL_VERSION = '1';

async function bootstrap(): Promise<void> {
  const context = await NestFactory.createApplicationContext(
    AppModule.forRoot(),
    {
      bufferLogs: true,
    },
  );
  const logger = context.get<Logger>(Logger);
  const config = context.get<ConfigService<ICoreApiConfig>>(ConfigService);

  const apiConfig = config.get<IApiOptions>('api');
  const globalPrefix = apiConfig.globalPrefix;

  const isSeedOnly = process.argv.includes('--seed-only');

  const seeds = context.get<SeedingService>(SeedingService);
  logger.log(`Seeds starting`);
  await seeds.runAsync();
  logger.log(`Seeds applied`);

  await context.close();

  if (isSeedOnly) {
    logger.log(`Seed-only mode completed. Exiting...`);
    process.exit(0);
  }

  const app = await NestFactory.create(AppModule.forRoot());

  app.setGlobalPrefix(globalPrefix, {});
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: GLOBAL_VERSION,
  });

  app.useLogger(app.get(Logger));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(
    new RpcGlobalExceptionInterceptor(),
    new SentryInterceptor(),
  );
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  addSwagger(app, globalPrefix);

  logger.log(`Application starting on ${apiConfig.env} environment`);

  await app.listen(apiConfig.port, apiConfig.host);

  logger.log(
    `Application is running on: http://${apiConfig.host}:${apiConfig.port}/${globalPrefix}/v${GLOBAL_VERSION}`,
  );
  logger.log(
    `Global URL: ${apiConfig.domain}/${globalPrefix}/v${GLOBAL_VERSION}`,
  );
  logger.log(`Documentation URL: ${apiConfig.domain}/${globalPrefix}/docs`);
}

function addSwagger(app: INestApplication, globalPrefix: string): void {
  const swagger = new DocumentBuilder()
    .setTitle(`Core APIs`)
    .setDescription(`${PCKG_NAME.toUpperCase()} API Documentation`)
    .setVersion(PCKG_VERSION)
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'admin',
    )
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'end-user',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swagger);
  SwaggerModule.setup(`${globalPrefix}/docs`, app, document);
}

void bootstrap();
