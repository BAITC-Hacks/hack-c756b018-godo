import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { multerOptions } from '../../config/multer.config';
import { appConfig } from '../../config/app.config';
import { EvidenceService } from './evidence.service';
import { EvidenceEntity } from './entities/evidence.entity';

@ApiTags('evidence')
@Controller('cases')
export class EvidenceController {
  constructor(private readonly evidenceService: EvidenceService) {}

  @Post(':id/evidence')
  @ApiOperation({
    summary: 'Загрузить доказательства по кейсу (скриншоты, чеки, PDF, аудио)',
    description:
      'Принимается в состоянии COLLECTING_EVIDENCE. Файлы сохраняются на диск, метаданные — в БД. Содержимое анализируется при POST /cases/:id/analyze.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Изображения, аудио или PDF (до 10 файлов, по 10 МБ)',
        },
      },
    },
  })
  @ApiOkResponse({ type: [EvidenceEntity] })
  @ApiBadRequestResponse({ description: 'Файлы не переданы' })
  @ApiConflictResponse({ description: 'Недопустимое состояние кейса' })
  @UseInterceptors(
    FilesInterceptor('files', appConfig.maxFilesPerRequest, multerOptions),
  )
  upload(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<EvidenceEntity[]> {
    return this.evidenceService.upload(id, files ?? []);
  }

  @Get(':id/evidence')
  @ApiOperation({ summary: 'Список доказательств кейса' })
  @ApiOkResponse({ type: [EvidenceEntity] })
  @ApiNotFoundResponse({ description: 'Кейс не найден' })
  list(@Param('id', ParseUUIDPipe) id: string): Promise<EvidenceEntity[]> {
    return this.evidenceService.list(id);
  }
}
