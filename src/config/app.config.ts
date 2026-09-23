export const appConfig = {
  name: 'qorgau-ai-backend',
  version: '0.1.0',
  port: Number(process.env.PORT ?? 3000),
  apiPrefix: 'api/v1',
  swaggerTitle: 'Қорғау AI API',
  swaggerPath: 'docs',
  uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
  maxFileSizeBytes: 10 * 1024 * 1024,
  maxFilesPerRequest: 10,
};

/**
 * Строка подключения к PostgreSQL: DB_URL целиком или собирается
 * из DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME.
 * Читается в app.module.ts через ConfigService (useFactory).
 */
export function resolveDatabaseUrlFromEnv(env: NodeJS.ProcessEnv = process.env): string {
  const url = env.DB_URL ?? '';
  if (url) return url;
  const host = env.DB_HOST ?? '';
  if (!host) return '';
  const user = encodeURIComponent(env.DB_USER ?? 'postgres');
  const password = encodeURIComponent(env.DB_PASSWORD ?? '');
  const port = env.DB_PORT ?? '5432';
  const name = env.DB_NAME ?? 'postgres';
  return `postgresql://${user}:${password}@${host}:${port}/${name}`;
}
