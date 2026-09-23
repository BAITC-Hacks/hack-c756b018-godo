# Career Quest

**AI-навигатор карьерного развития сотрудников** (Halyk Bank Track).

## Что решает продукт

Career Quest помогает сотрудникам и HR-службе управлять карьерным ростом:

- **Для сотрудника** — показывает текущий профиль навыков, разрыв с требованиями
  следующего грейда и персональные AI-рекомендации мероприятий с понятным
  обоснованием (Explainability): почему именно это событие и какой навык оно
  закроет. Пройденные активности отмечаются одной кнопкой, прогресс
  пересчитывается автоматически.
- **Для HR** — дашборд со списком сотрудников и аналитикой: проседающие навыки
  по команде и зона риска (кто системно отстаёт от требований целевого грейда).
- **AI-движок** анализирует профиль, требования грейда, историю активностей за
  24 месяца и доступные мероприятия, затем возвращает 1–3 рекомендации с
  приоритетом, прогнозируемым приростом навыка и объяснением минимум по трём
  факторам. Работает на Anthropic Claude, при недоступности API автоматически
  переключается на детерминированный fallback (mock), поэтому демо не падает.

## Стек

**Backend** (`/src`, NestJS):
- NestJS 11 + TypeScript, TypeORM 0.3, PostgreSQL 15 (SQLite — альтернатива)
- Swagger (`@nestjs/swagger`) — интерактивная документация API
- `class-validator` / `class-transformer` — валидация DTO
- `@anthropic-ai/sdk` — AI-рекомендации (модель по умолчанию `claude-3-5-sonnet`)
- Jest + Supertest — юнит- и интеграционные тесты

**Frontend** (`/frontend`, Next.js):
- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4, Framer Motion, lucide-react, Zustand

**Инфраструктура**: Docker / docker-compose (db + backend + frontend).

## Запуск

### Вариант 1 — Docker (всё сразу)

```sh
docker compose up --build
```

Поднимаются три сервиса:

| Сервис   | URL                            |
| -------- | ------------------------------ |
| Frontend | http://localhost:3001          |
| Backend  | http://localhost:3000          |
| Swagger  | http://localhost:3000/docs     |
| Postgres | localhost:5432 (career_quest)  |

Для реального AI задайте в `docker-compose.yml`:

```yaml
AI_PROVIDER: anthropic
ANTHROPIC_API_KEY: <ваш ключ>
```

По умолчанию `AI_PROVIDER: mock` — рекомендации генерируются без внешнего API.

### Вариант 2 — локально

1. База данных — поднять только Postgres:

   ```sh
   docker compose up db
   ```

   Либо указать свой Postgres/Supabase через `DB_URL`
   (для Supabase SSL включается автоматически).

2. Backend:

   ```sh
   npm install
   npm run start:dev
   ```

   Переменные окружения (все опциональны, есть значения по умолчанию):
   `PORT` (3000), `DB_URL` либо `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME`,
   `DB_SSL`, `AI_PROVIDER` (`mock` | `anthropic`), `ANTHROPIC_API_KEY`,
   `ANTHROPIC_MODEL`, `ANTHROPIC_MAX_TOKENS`.
   Схема БД синхронизируется автоматически (`synchronize: true`).

3. Frontend:

   ```sh
   cd frontend
   npm install
   npm run dev
   ```

   Открывается на http://localhost:3001 и ходит в backend по `/api/*`
   (адрес настраивается переменной `BACKEND_URL`).

## Аутентификация

В интерфейсе сверху расположен переключатель **«Сотрудник / HR»**.
Выбор сохраняется в браузере и задаёт `X-Role` для всех API-запросов.
В режиме сотрудника доступен личный профиль; переключение на HR открывает
обзор команды и загрузку данных. HR может просматривать рекомендации,
но отметка о прохождении доступна только в режиме сотрудника.

Для хакатона используется упрощённая ролевая модель через HTTP-заголовки,
без регистрации и паролей (осознанное ограничение демо, не для продакшена):

- `X-Role: employee` (по умолчанию) или `X-Role: hr`; любая другая роль — `403`.
- `X-Employee-Id: E0028` — обязателен для сотрудника. Сотрудник видит только
  свой профиль, рекомендации и свои активности; несовпадение ID — `403`.
- HR читает любые профили и аналитику без `X-Employee-Id`.
- Маршруты `/hr/*` и `POST /dataset/load` — только для HR.
- `RolesGuard` подключён глобально через `APP_GUARD`; в продакшене перед ним
  добавляется JWT, правила `@Roles()` и проверки владельца не меняются.

## API

Интерактивная документация: **http://localhost:3000/docs**

Основные эндпоинты (каждый доступен с префиксом `/api/...` и без него):

| Метод | Путь                             | Роль     | Описание                                        |
| ----- | -------------------------------- | -------- | ----------------------------------------------- |
| GET   | `/employees/:id`                 | emp / hr | Профиль сотрудника и его навыки                 |
| GET   | `/employees/:id/recommendations` | emp / hr | AI-рекомендации с объяснением                   |
| POST  | `/employees/activities/complete` | employee | Отметить активность, пересчитать прогресс       |
| POST  | `/activities/complete`           | employee | То же, по `employeeId` + `eventId` в теле       |
| GET   | `/hr/employees`                  | hr       | Список сотрудников для HR-дашборда              |
| GET   | `/hr/analytics`                  | hr       | Проседающие навыки и зона риска                 |
| POST  | `/hr/import`, `/dataset/load`    | hr       | Импорт JSON-датасета для проверки жюри          |

### Примеры запросов

Backend работает на `http://localhost:3000`.
В Windows PowerShell используйте `curl.exe` вместо `curl`.

```sh
# Сотрудник читает свой профиль
curl -i http://localhost:3000/employees/E0028 -H "X-Role: employee" -H "X-Employee-Id: E0028"

# Рекомендации (роль employee — по умолчанию)
curl -i http://localhost:3000/employees/E0028/recommendations -H "X-Employee-Id: E0028"

# HR: профиль, рекомендации, аналитика
curl -i http://localhost:3000/employees/E0028 -H "X-Role: hr"
curl -i http://localhost:3000/hr/analytics -H "X-Role: hr"

# Загрузка датасета жюри (JSON с массивами employees, events, skills, history)
curl -i http://localhost:3000/dataset/load -H "X-Role: hr" \
  -H "Content-Type: application/json" --data-binary @dataset.json
```

Попытка сотрудника открыть HR-аналитику или чужой профиль возвращает `403`:

```json
{
  "message": "Доступ разрешён только для указанных ролей",
  "error": "Forbidden",
  "statusCode": 403
}
```

## Проверка решения

1. **Сборка и тесты**

   ```sh
   npm run build          # сборка backend
   npm test -- --runInBand
   ```

   Тест `src/common/roles.guard.spec.ts` прогоняет реальные контроллеры через
   HTTP с подменёнными сервисами (без БД) и проверяет все правила ролей:
   доступ HR/employee, запрет чужого профиля, запрет HR на завершение активностей.

   Для frontend:

   ```sh
   cd frontend
   npm run typecheck
   npm run lint
   ```

2. **Сценарий ручной проверки**

   1. `docker compose up --build`, дождаться старта всех сервисов.
   2. Загрузить датасет: `POST /dataset/load` с `X-Role: hr` (см. пример выше).
   3. Открыть http://localhost:3001, войти как сотрудник `E0028` —
       проверить профиль, разрыв навыков и AI-рекомендации с объяснением.
   4. Отметить рекомендацию пройденной — прогресс навыка должен вырасти.
   5. Открыть HR-режим — проверить список сотрудников и аналитику
      (проседающие навыки, зона риска).
   6. Проверить разграничение доступа: запрос
      `/hr/analytics` с `X-Role: employee` должен вернуть `403`,
      как и чтение чужого профиля сотрудником.
   7. Swagger: открыть http://localhost:3000/docs и убедиться,
      что все эндпоинты задокументированы.
