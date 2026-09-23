import { Module } from '@nestjs/common';
import { AdiletKbService } from './adilet-kb.service';

@Module({
  providers: [AdiletKbService],
  exports: [AdiletKbService],
})
export class AdiletModule {}
