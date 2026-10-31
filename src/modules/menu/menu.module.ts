import { Module } from '@nestjs/common';
import { MenuController } from './menu.controller';
import { MenuRepository } from './menu.repository';

@Module({
  controllers: [MenuController],
  providers: [MenuRepository],
})
export class MenuModule {}
