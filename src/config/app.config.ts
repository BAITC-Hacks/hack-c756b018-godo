export const appConfig = {
  name: 'qorgau-ai-backend',
  version: '0.1.0',
  port: Number(process.env.PORT ?? 3000),
  apiPrefix: 'api/v1',
  swaggerTitle: 'Қорғау AI API',
  swaggerPath: 'api/v1/docs',
  database: process.env.DB_PATH ?? 'db.sqlite',
  uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
  maxFileSizeBytes: 10 * 1024 * 1024,
  maxFilesPerRequest: 10,
};
