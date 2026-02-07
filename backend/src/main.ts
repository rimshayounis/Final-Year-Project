
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // ✅ Auto-create uploads folder if it doesn't exist
  const uploadDir = join(__dirname, '..', 'uploads', 'certificates');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('✅ Created uploads/certificates directory');
  }
  
  // Enable CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Enable validation
  app.useGlobalPipes(new ValidationPipe());

  // ✅ Serve uploaded files statically
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // API prefix
  app.setGlobalPrefix('api');

  await app.listen(3000);
  console.log('🚀 TruHeal-Link Backend is running on: http://localhost:3000');
  console.log('📁 Uploads accessible at: http://localhost:3000/uploads/');
}
bootstrap();