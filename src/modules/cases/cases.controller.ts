import {
  Body,
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
  ApiBody,
  ApiConsumes,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { multerOptions } from '../../config/multer.config';
import { AnalyzeCaseDto } from './dto/analyze-case.dto';
import { CaseResponseDto } from './dto/case-response.dto';
import { CasesService } from './cases.service';
import { CaseEntity } from './entities/case.entity';

@ApiTags('cases')
@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Post('analyze')
  @ApiOperation({
    summary: 'Анализ ситуации пользователя (заглушка AI-анализа)',
    description:
      'Принимает описание ситуации и файлы (картинки/аудио/PDF), сохраняет кейс и возвращает структурированный разбор: факты, статьи, доказательства, следующие шаги.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        textDescription: { type: 'string', description: 'Описание ситуации' },
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Чеки, аудио, скриншоты (до 10 файлов, по 10 МБ)',
        },
      },
    },
  })
  @ApiOkResponse({ type: CaseResponseDto })
  @UseInterceptors(FilesInterceptor('files', undefined, multerOptions))
  analyze(
    @Body() dto: AnalyzeCaseDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<CaseResponseDto> {
    return this.casesService.analyze(dto, files ?? []);
  }

  @Get()
  @ApiOperation({ summary: 'История обращений' })
  @ApiOkResponse({ type: [CaseResponseDto] })
  findAll(): Promise<CaseEntity[]> {
    return this.casesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить кейс по ID' })
  @ApiOkResponse({ type: CaseResponseDto })
  @ApiNotFoundResponse({ description: 'Кейс не найден' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<CaseEntity> {
    return this.casesService.findOne(id);
  }
}
