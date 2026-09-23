import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  CaseAnswersDto,
  CaseFullDto,
  CaseMessageDto,
  CaseSummaryDto,
  CreateCaseDto,
  FactsResponseDto,
  LegalResponseDto,
  ActionPlanResponseDto,
} from './dto/case-dtos';
import { CasesService } from './cases.service';
import { CaseEntity } from './entities/case.entity';

@ApiTags('cases')
@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Post()
  @ApiOperation({
    summary: 'Создать кейс: описание ситуации → факты + до 3 вопросов',
    description:
      'Извлекает факты из описания (FactExtractor) и формирует уточняющие вопросы (QuestionGenerator). Кейс переходит в состояние COLLECTING_INFORMATION.',
  })
  @ApiCreatedResponse({ type: CaseFullDto })
  create(@Body() dto: CreateCaseDto): Promise<CaseEntity> {
    return this.casesService.create(dto);
  }

  @Post(':id/message')
  @ApiOperation({
    summary: 'Дополнительное сообщение пользователя по кейсу',
    description:
      'Принимается в состоянии COLLECTING_INFORMATION; факты и вопросы пересчитываются.',
  })
  @ApiOkResponse({ type: CaseFullDto })
  @ApiConflictResponse({ description: 'Недопустимое состояние кейса' })
  addMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CaseMessageDto,
  ): Promise<CaseEntity> {
    return this.casesService.addMessage(id, dto);
  }

  @Post(':id/answers')
  @ApiOperation({
    summary: 'Ответы на уточняющие вопросы',
    description:
      'Ответы вносятся в факты, кейс переходит в COLLECTING_EVIDENCE. Пустой массив допустим (пропустить вопросы).',
  })
  @ApiOkResponse({ type: CaseFullDto })
  @ApiConflictResponse({ description: 'Недопустимое состояние кейса' })
  @ApiNotFoundResponse({ description: 'Кейс не найден' })
  submitAnswers(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CaseAnswersDto,
  ): Promise<CaseEntity> {
    return this.casesService.submitAnswers(id, dto);
  }

  @Post(':id/analyze')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Полный анализ кейса',
    description:
      'Анализ доказательств → генерация запросов → правовой поиск (Adilet KB) → разбор норм (только по найденным источникам) → план действий. Состояние становится ACTION_PLAN_READY.',
  })
  @ApiOkResponse({ type: CaseFullDto })
  @ApiConflictResponse({ description: 'Кейс не в состоянии COLLECTING_EVIDENCE' })
  analyze(@Param('id', ParseUUIDPipe) id: string): Promise<CaseEntity> {
    return this.casesService.analyze(id);
  }

  @Get()
  @ApiOperation({ summary: 'Список кейсов' })
  @ApiOkResponse({ type: [CaseSummaryDto] })
  findAll(): Promise<CaseEntity[]> {
    return this.casesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Кейс целиком (факты, вопросы, поиск, план)' })
  @ApiOkResponse({ type: CaseFullDto })
  @ApiNotFoundResponse({ description: 'Кейс не найден' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<CaseEntity> {
    return this.casesService.findOne(id);
  }

  @Get(':id/facts')
  @ApiOperation({ summary: 'Извлечённые факты и уточняющие вопросы' })
  @ApiOkResponse({ type: FactsResponseDto })
  @ApiNotFoundResponse({ description: 'Кейс не найден' })
  getFacts(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Pick<CaseEntity, 'facts' | 'questions'>> {
    return this.casesService.getFacts(id);
  }

  @Get(':id/legal')
  @ApiOperation({
    summary: 'Найденные нормы законодательства РК и их разбор',
    description:
      'Возвращает LegalResearchResult (citedSources со ссылками adilet.zan.kz) и LegalAnalysisResult.',
  })
  @ApiOkResponse({ type: LegalResponseDto })
  @ApiNotFoundResponse({ description: 'Кейс не найден' })
  getLegal(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Pick<CaseEntity, 'legalResearch' | 'legalAnalysis'>> {
    return this.casesService.getLegal(id);
  }

  @Get(':id/action-plan')
  @ApiOperation({ summary: 'План действий' })
  @ApiOkResponse({ type: ActionPlanResponseDto })
  @ApiNotFoundResponse({ description: 'Кейс не найден' })
  getActionPlan(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Pick<CaseEntity, 'actionPlan'>> {
    return this.casesService.getActionPlan(id);
  }
}
