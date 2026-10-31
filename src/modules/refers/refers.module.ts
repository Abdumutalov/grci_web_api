import { Module } from '@nestjs/common';
import { RefersController } from './refers.controller';
import { RefersRepository } from './refers.repository';

@Module({
  controllers: [RefersController],
  providers: [RefersRepository],
})
export class RefersModule {}
