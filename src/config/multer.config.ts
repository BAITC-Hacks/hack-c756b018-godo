import { extname } from 'node:path';
import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { appConfig } from './app.config';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/mp4',
  'application/pdf',
]);

export const multerOptions: MulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, appConfig.uploadDir);
    },
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${extname(file.originalname).toLowerCase()}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(
      new BadRequestException(
        `Недопустимый тип файла: ${file.mimetype}. Разрешены изображения, аудио и PDF.`,
      ),
      false,
    );
  },
  limits: {
    fileSize: appConfig.maxFileSizeBytes,
    files: appConfig.maxFilesPerRequest,
  },
};
