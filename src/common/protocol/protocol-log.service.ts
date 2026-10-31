import { Global, Injectable, Module } from '@nestjs/common';
import { protocolWrite } from './protocol-log';

/** DI-обёртка над файловым протоколом (см. protocol-log.ts). */
@Injectable()
export class ProtocolLogService {
  write(text: string, fileName: string, method: string, isSuccess: boolean, writeError = false): Promise<void> {
    return protocolWrite(text, fileName, method, isSuccess, writeError);
  }
}

@Global()
@Module({
  providers: [ProtocolLogService],
  exports: [ProtocolLogService],
})
export class ProtocolLogModule {}
