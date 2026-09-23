import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Қорғау AI — полный MVP-сценарий (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.enableCors({ origin: true, credentials: true });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('создание → вопросы → ответы → доказательства → анализ → план → черновик', async () => {
    const description =
      'Оплатил телефон 45000 тенге 15 сентября в интернет-магазине example.kz через Kaspi. ' +
      'Продавец не отправил товар и перестал отвечать на сообщения в WhatsApp.';

    // 1. Создание кейса: факты + вопросы
    const created = await request(app.getHttpServer())
      .post('/api/v1/cases')
      .send({ description })
      .expect(201);
    expect(created.body.state).toBe('COLLECTING_INFORMATION');
    expect(created.body.facts.facts.length).toBeGreaterThan(0);
    expect(Array.isArray(created.body.questions)).toBe(true);
    const caseId: string = created.body.id;

    // 2. Анализ до ответов запрещён
    await request(app.getHttpServer())
      .post(`/api/v1/cases/${caseId}/analyze`)
      .expect(409);

    // 3. Ответы на вопросы → COLLECTING_EVIDENCE
    const answers = (created.body.questions as { id: string }[]).map((q) => ({
      questionId: q.id,
      answer: 'тестовый ответ пользователя',
    }));
    const answered = await request(app.getHttpServer())
      .post(`/api/v1/cases/${caseId}/answers`)
      .send({ answers })
      .expect(201);
    expect(answered.body.state).toBe('COLLECTING_EVIDENCE');

    // 4. Доказательства
    const uploaded = await request(app.getHttpServer())
      .post(`/api/v1/cases/${caseId}/evidence`)
      .attach('files', Buffer.from('%PDF-1.4 test'), {
        filename: 'check.png',
        contentType: 'image/png',
      })
      .expect(201);
    expect(uploaded.body.length).toBe(1);
    expect(uploaded.body[0].kind).toBe('image');

    // 5. Анализ: доказательства → поиск → разбор норм → план
    const analyzed = await request(app.getHttpServer())
      .post(`/api/v1/cases/${caseId}/analyze`)
      .expect(200);
    expect(analyzed.body.state).toBe('ACTION_PLAN_READY');
    const citedSources = analyzed.body.legalResearch.citedSources;
    expect(citedSources.length).toBeGreaterThan(0);
    for (const source of citedSources) {
      expect(source.adiletUrl).toContain('adilet.zan.kz');
      expect(source.contentSnippet.length).toBeGreaterThan(20);
    }
    // разбор норм ссылается только на найденные источники
    const legalIds = new Set(citedSources.map((s: { articleId: string }) => s.articleId));
    for (const explanation of analyzed.body.legalAnalysis.explanations) {
      expect(legalIds.has(explanation.articleId)).toBe(true);
    }
    expect(analyzed.body.actionPlan.steps.length).toBeGreaterThan(0);
    expect(analyzed.body.actionPlan.caveats.length).toBeGreaterThan(0);

    // 6. Чтение разделов
    const facts = await request(app.getHttpServer())
      .get(`/api/v1/cases/${caseId}/facts`)
      .expect(200);
    expect(facts.body.facts.facts.length).toBeGreaterThan(0);

    const legal = await request(app.getHttpServer())
      .get(`/api/v1/cases/${caseId}/legal`)
      .expect(200);
    expect(legal.body.legalResearch.queries.length).toBeGreaterThan(0);
    expect(legal.body.legalResearch.summary).toContain('источник');

    const plan = await request(app.getHttpServer())
      .get(`/api/v1/cases/${caseId}/action-plan`)
      .expect(200);
    expect(plan.body.actionPlan).not.toBeNull();

    // 7. Черновик: генерация → чтение → правка
    const draft = await request(app.getHttpServer())
      .post(`/api/v1/cases/${caseId}/draft`)
      .send({})
      .expect(201);
    expect(draft.body.state ?? 'DRAFT_READY').toBeTruthy();
    expect(draft.body.documentText).toContain('adilet.zan.kz');
    expect(draft.body.documentText).toContain('[Ф.И.О. заявителя]');
    expect(draft.body.warnings.join(' ')).toContain('проверки');

    const fetched = await request(app.getHttpServer())
      .get(`/api/v1/cases/${caseId}/draft`)
      .expect(200);
    expect(fetched.body.caseId).toBe(caseId);
    expect(fetched.body.version).toBe(1);

    const patched = await request(app.getHttpServer())
      .patch(`/api/v1/cases/${caseId}/draft`)
      .send({
        documentText:
          'Отредактированный пользователем текст заявления, проверенный вручную перед отправкой.',
      })
      .expect(200);
    expect(patched.body.isEditedByUser).toBe(true);

    const full = await request(app.getHttpServer())
      .get(`/api/v1/cases/${caseId}`)
      .expect(200);
    expect(full.body.state).toBe('DRAFT_READY');
    expect(full.body.evidence.length).toBe(1);
    expect(full.body.documents.length).toBe(1);
  });

  it('отклоняет некорректное создание кейса (короткое описание)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/cases')
      .send({ description: 'коротко' })
      .expect(400);
  });
});
