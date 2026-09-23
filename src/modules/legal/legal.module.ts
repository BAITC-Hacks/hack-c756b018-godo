import { Module } from '@nestjs/common';
import { AdiletModule } from '../adilet-kb/adilet.module';
import { LegalResearchService } from './legal-research.service';

@Module({
  imports: [AdiletModule],
  providers: [LegalResearchService],
  exports: [LegalResearchService],
})
export class LegalModule {}
