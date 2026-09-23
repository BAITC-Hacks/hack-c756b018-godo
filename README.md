web application/stitch/projects/2284526729819434208/screens/77d57fde4436458798bf3c404ae0e74c<img width="1376" height="768" alt="image" src="https://github.com/user-attachments/assets/1c25db11-d6cf-4112-905c-19d642c10907" />

# Career Quest

Веб-приложение для развития сотрудников: профиль, траектория к следующему грейду, объяснимые рекомендации, прогресс после активности и HR-аналитика. Данные в `data/` синтетические.

## Запуск

```bash
docker compose up --build
```

Откройте [приложение](http://localhost:3001) и [Swagger](http://localhost:3000/docs). При первом запуске импортируйте файлы `data/` через HR-экран или вызовите:

```bash
curl -X POST http://localhost:3000/api/admin/import -H 'x-user-role: HR'
```

`POST /api/admin/import` читает `./data/employees.json`, `events.json`, `skills.json`, `activity_history.csv` и **заменяет** данные четырёх таблиц Career Quest в одной транзакции. Контейнер монтирует каталог `data/`, поэтому проверочные файлы жюри можно положить туда и повторить вызов. `POST /api/hr/import` принимает JSON с массивами `employees`, `events`, `skills`, `history` и обновляет только переданные записи; это маршрут загрузки отдельных файлов из интерфейса.

## Хранение и расчёт

PostgreSQL содержит `career_employees` с навыками JSONB, `career_events`, `career_skill_requirements` с требованиями JSONB и `career_activity_history`. При импорте `skipped` из CSV становится `MISSED`; ссылки истории на неизвестного сотрудника или событие вызывают ошибку, транзакция откатывается. Уровни навыков ограничены 0–5. Повторная загрузка CSV через HR-экран не дублирует одинаковые записи.

`GET /api/employees/:id/recommendations` вычисляет разрыв между текущим навыком и требованием целевого грейда. Навык с двумя или более пропусками/отказами исключается. Далее исключаются уже выполненные события, неподходящая аудитория и события с достигнутым `maxLevel`; оставшиеся сортируются по разрыву, реальному приросту и истории участия. В OpenAI передаются только профиль одного сотрудника и TOP-5 событий. Модель может выбрать лишь ID из этого списка. Ответ всегда дополняется проверяемыми фактами: грейд, текущий и требуемый уровень, разрыв, прирост и история. При ошибке или таймауте 1,5 секунды используется локальный порядок. Если допустимых событий нет, ответ — `[]`, OpenAI не вызывается.

Для OpenAI задайте `AI_PROVIDER=openai`, `OPENAI_API_KEY`, опционально `OPENAI_MODEL` (по умолчанию `gpt-4o-mini`) и `OPENAI_MAX_TOKENS`. В логах backend видны `OpenAI request start`, `OpenAI request end` с HTTP-статусом, `x-request-id`, длительностью и usage; либо `OpenAI fallback` с причиной. Ключ и содержимое профиля не логируются. Логи: `docker compose logs -f backend`.

`POST /api/employees/:id/complete-event/:eventId` атомарно повышает навык до `min(current + gain, maxLevel)`, записывает `COMPLETED` и возвращает обновлённый профиль. Повторное завершение отклоняется. Для существующего фронтенда сохранён `POST /api/activities/complete` с телом `{"employeeId":"E0028","eventId":"EV_SYSTEM"}`.

`GET /api/hr/analytics` отдаёт пять навыков с наибольшей суммой разрывов по компании, сотрудников без допустимых следующих шагов и участие по событиям. HR-срез использует тот же предфильтр, но не вызывает LLM для каждого сотрудника.

## Проверка

После импорта `data/` запросите рекомендации для `E0028` с заголовками `x-user-role: EMPLOYEE`, `x-user-id: E0028`. Public Speaking трижды пропущен и не должен попасть в ответ; System Design имеет разрыв 2 до Senior и должен быть предложен. Затем завершите `EV_SYSTEM` и проверьте, что уровень вырос с 2 до 3 и готовность изменилась.

```bash
npm ci
npm test -- --runInBand
npm run build
cd frontend
npm ci
