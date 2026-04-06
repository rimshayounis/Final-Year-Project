import { Controller, Post, Body, Param } from '@nestjs/common';
import { IsNumber, IsOptional, IsArray, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { SosService } from './sos.service';
import { ChatMessage } from './sos.types'; // 👈 import from types file

class ChatMessageDto implements ChatMessage { // 👈 implements the interface
  @IsString()
  role!: string;

  @IsString()
  text!: string;
}

class TriggerSosDto {
  @IsNumber()
  lat!: number;

  @IsNumber()
  lng!: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  chatHistory?: ChatMessageDto[];
}

@Controller('sos')
export class SosController {
  constructor(private readonly sosService: SosService) {}

  @Post(':userId/trigger')
  async triggerSOS(
    @Param('userId') userId: string,
    @Body() body: TriggerSosDto,
  ) {
    return this.sosService.triggerSOS(userId, body);
  }
}
