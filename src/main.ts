import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

import { AppModule } from './app.module';
import { envs } from './configs';

async function bootstrap() {

  const logger = new Logger('Main-Orders');

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    /*{
      transport: Transport.TCP,
      options: {
        port: envs.port
      }
    }*/
    {
      transport: Transport.NATS,
      options: {
        servers: envs.natsServers
      }
    }
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true
    })
  )

  await app.listen();
  logger.log(`Orders microservice running on port ${envs.port}`);

}
bootstrap();
