import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { saveComponent, deleteComponent, listComponents } from './fileService.js';
import { sanitizeFile } from './sanitizeService.js';
import { parseCheckFile } from './parseCheckService.js';
import { exportZipToResponse } from './exportZipService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REGISTRY_PATH = path.resolve(__dirname, '..', 'src', 'registry.ts');

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

const handleListComponents: express.RequestHandler = (_req, res) => {
  try {
    const items = listComponents();
    res.json({ success: true, items });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : 'Failed to load components',
    });
  }
};

app.get('/', (_req, res) => {
  res.json({ success: true, service: 'snapforge-file-service' });
});

app.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok' });
});

app.get('/components', handleListComponents);
app.get('/api/components', handleListComponents);

app.post('/save-component', (req, res) => {
  const { name, code, htmlSource, cssSource, framework, category, subcategory, tags, dependencies } = req.body;

  if (!name || !code || !category || !subcategory) {
    res.status(400).json({
      success: false,
      status: 'error',
      message: 'Missing required fields: name, code, category, subcategory',
    });
    return;
  }

  const result = saveComponent({
    name,
    code,
    htmlSource,
    cssSource,
    framework: framework || 'html',
    category,
    subcategory,
    tags: tags || [],
    dependencies: dependencies || [],
  });

  if (result.success) {
    // Touch registry.ts to force Vite to invalidate its glob cache
    const now = new Date();
    fs.utimesSync(REGISTRY_PATH, now, now);
  }

  res.status(result.success ? 200 : 409).json(result);
});

app.delete('/delete-component', (req, res) => {
  const { filePath } = req.body;

  if (!filePath) {
    res.status(400).json({ success: false, message: 'Missing filePath' });
    return;
  }

  const result = deleteComponent(filePath);

  if (result.success) {
    const now = new Date();
    fs.utimesSync(REGISTRY_PATH, now, now);
  }

  res.status(result.success ? 200 : 404).json(result);
});

app.post('/api/postprocess-component', (req, res) => {
  const { filePath } = req.body;

  if (!filePath) {
    res.status(400).json({ success: false, message: 'Missing filePath' });
    return;
  }

  const sanitizeResult = sanitizeFile(filePath);
  const parseResult = parseCheckFile(filePath);

  res.json({
    success: true,
    sanitized: sanitizeResult.sanitized,
    appliedRules: sanitizeResult.appliedRules,
    parseOk: parseResult.parseOk,
    parseErrors: parseResult.parseErrors,
  });
});

app.post('/export-zip', (req, res) => {
  exportZipToResponse(req.body, res);
});

app.listen(PORT, () => {
  console.log(`File service running at http://localhost:${PORT}`);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});
