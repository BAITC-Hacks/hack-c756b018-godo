import { Module } from '@nestjs/common';
import { AdiletService } from './adilet.service';

@Module({
  providers: [AdiletService],
  exports: [AdiletService],
})
export class AdiletModule {}
