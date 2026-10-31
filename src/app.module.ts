import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { ProtocolLogModule } from './common/protocol/protocol-log.service';
import { DatabaseModule } from './database/database.module';
import { ChartModule } from './modules/chart/chart.module';
import { InteractionModule } from './modules/interaction/interaction.module';
import { MenuModule } from './modules/menu/menu.module';
import { OfflineModule } from './modules/offline/offline.module';
import { OnlineModule } from './modules/online/online.module';
import { RefersModule } from './modules/refers/refers.module';
import { ReportModule } from './modules/report/report.module';

/**
 * Корневой модуль. Набор и префиксы маршрутов — как в server.js оригинала:
 * /offline, /online, /user, /menu, /refer, /chart, /interaction, /report.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    ProtocolLogModule,
    DatabaseModule,
    AuthModule,
    OfflineModule,
    OnlineModule,
    MenuModule,
    RefersModule,
    ChartModule,
    InteractionModule,
    ReportModule,
  ],
})
export class AppModule {}
