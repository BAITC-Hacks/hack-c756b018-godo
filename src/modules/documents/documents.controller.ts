import { Body, Controller, Post } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  DocumentResponseDto,
  GenerateDocumentDto,
} from './dto/generate-document.dto';
import { DocumentsService } from './documents.service';

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('generate')
  @ApiOperation({
    summary: 'Сгенерировать черновик документа по кейсу',
    description:
      'Возвращает готовый текст заявления: обращение в eOtinish либо заявление в РОВД, собранный из данных кейса.',
  })
  @ApiOkResponse({ type: DocumentResponseDto })
  @ApiNotFoundResponse({ description: 'Кейс не найден' })
  generate(@Body() dto: GenerateDocumentDto): Promise<DocumentResponseDto> {
    return this.documentsService.generate(dto);
  }
}
