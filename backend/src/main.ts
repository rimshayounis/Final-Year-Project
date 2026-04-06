import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const uploadsBase = join(process.cwd(), 'uploads');

  const dirs = [
    join(uploadsBase, 'certificates'),
    join(uploadsBase, 'posts'),
    join(uploadsBase, 'profiles'),
    join(uploadsBase, 'chat', 'image'),
    join(uploadsBase, 'chat', 'video'),
    join(uploadsBase, 'chat', 'voice'),
    join(uploadsBase, 'chat', 'document'),
  ];

  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Created: ${dir}`);
    }
  });

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  app.setGlobalPrefix('api');

  // Drop the old strict unique index — cancelled slots must be re-bookable
  try {
    const conn = app.get<Connection>(getConnectionToken());
    await conn.db!.collection('bookedappointments').dropIndex('doctorId_1_date_1_time_1');
    console.log('✅ Dropped legacy unique slot index');
  } catch {
    // Already gone — ignore
  }

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Server: http://localhost:${port}`);
  console.log(`📁 Uploads: http://localhost:${port}/uploads/`);
  console.log(`📁 Uploads folder on disk: ${uploadsBase}`);
  console.log(`🔗 API: http://localhost:${port}/api`);
}
bootstrap();