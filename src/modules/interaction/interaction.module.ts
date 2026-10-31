import { Module } from '@nestjs/common';
import { InteractionController } from './interaction.controller';
import { InteractionRepository } from './interaction.repository';

@Module({
  controllers: [InteractionController],
  providers: [InteractionRepository],
})
export class InteractionModule {}
