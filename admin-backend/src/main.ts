import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
app.setGlobalPrefix('api'); // ← Add this line
  // CORS — allow Next.js frontend
app.enableCors({
  origin: ['http://localhost:3000', 'http://localhost:3002'],
  credentials: true,
});
  // Swagger API docs
  const config = new DocumentBuilder()
    .setTitle('TruHeal Admin API')
    .setDescription('Admin panel backend API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3001);
  console.log(`Admin backend running on: http://localhost:3001`);
  console.log(`Swagger docs: http://localhost:3001/api/docs`);
}
bootstrap();