import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'qorgau-e2e-'));
process.env.DB_TYPE = 'sqlite';
process.env.DB_PATH = join(dir, 'test.sqlite');
process.env.DB_URL = '';
process.env.DB_HOST = '';
process.env.UPLOAD_DIR = join(dir, 'uploads');
process.env.AI_PROVIDER = 'mock';
process.env.LEGAL_SOURCE = 'mock-kb';
process.env.PORT = '0';
