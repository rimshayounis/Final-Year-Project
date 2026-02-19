import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // ✅ Auto-create uploads folders if they don't exist
  const uploadsBase = join(__dirname, '..', 'uploads');
  const certificatesDir = join(uploadsBase, 'certificates');
  const postsDir = join(uploadsBase, 'posts');
  const profilesDir = join(uploadsBase, 'profiles');

  // Create all upload directories
  [certificatesDir, postsDir, profilesDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Created ${dir.split('uploads/')[1]} directory`);
    }
  });
  
  // Enable CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
       transformOptions: {
        enableImplicitConversion: true,  // ← converts strings to proper types
      },
    }),
  );

  // ✅ Serve uploaded files statically
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // API prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log('🚀 TruHeal-Link Backend is running on: http://localhost:' + port);
  console.log('📁 Uploads accessible at: http://localhost:' + port + '/uploads/');
  console.log('🔗 API Base URL: http://localhost:' + port + '/api');
}
bootstrap();