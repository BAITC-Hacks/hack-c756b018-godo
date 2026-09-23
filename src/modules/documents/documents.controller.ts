import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  DocumentResponseDto,
  GenerateDraftDto,
  PatchDraftDto,
} from './dto/document-dtos';
import { DocumentsService } from './documents.service';

@ApiTags('documents')
@Controller('cases')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post(':id/draft')
  @ApiOperation({
    summary: 'Сгенерировать редактируемый черновик заявления/обращения',
    description:
      'Выполняется после анализа (состояние ACTION_PLAN_READY). Роль DraftGenerator собирает документ ТОЛЬКО из фактов и найденных источников. Кейс переходит в DRAFT_READY. Пользователь обязан проверить и отредактировать текст перед отправкой.',
  })
  @ApiOkResponse({ type: DocumentResponseDto })
  @ApiConflictResponse({ description: 'Кейс не в состоянии ACTION_PLAN_READY' })
  @ApiNotFoundResponse({ description: 'Кейс не найден' })
  generate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GenerateDraftDto,
  ): Promise<DocumentResponseDto> {
    return this.documentsService.generateDraft(id, dto);
  }

  @Get(':id/draft')
  @ApiOperation({ summary: 'Получить последний черновик кейса' })
  @ApiOkResponse({ type: DocumentResponseDto })
  @ApiNotFoundResponse({ description: 'Кейс или черновик не найден' })
  getDraft(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DocumentResponseDto> {
    return this.documentsService.getDraft(id);
  }

  @Patch(':id/draft')
  @ApiOperation({
    summary: 'Сохранить отредактированный пользователем текст черновика',
  })
  @ApiOkResponse({ type: DocumentResponseDto })
  @ApiConflictResponse({ description: 'Кейс не в состоянии DRAFT_READY' })
  @ApiNotFoundResponse({ description: 'Кейс или черновик не найден' })
  patchDraft(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchDraftDto,
  ): Promise<DocumentResponseDto> {
    return this.documentsService.patchDraft(id, dto);
  }
}
