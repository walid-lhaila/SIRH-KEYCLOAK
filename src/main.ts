import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

dotenv.config();
async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>( AppModule, {
    transport: Transport.TCP,
    options: {
      host: '127.0.0.1',
      port: 3000
    },
  });

  await app.listen();
  console.log('API Gateway is running on: http://localhost:3000');

}
bootstrap();
