// TypeORM запрещает jsonb на sqlite (локальные e2e-тесты), на PostgreSQL/Supabase
// используем jsonb. Читается на момент импорта сущностей — .env уже загружен
// (dotenv в main.ts, в тестах — test/setup-env.ts).
export const jsonColumnType: 'jsonb' | 'json' =
  process.env.DB_TYPE === 'postgres' ? 'jsonb' : 'json';
