import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { saveComponent, deleteComponent } from './fileService.js';
import { sanitizeFile } from './sanitizeService.js';
import { parseCheckFile } from './parseCheckService.js';
import { exportZipToResponse } from './exportZipService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REGISTRY_PATH = path.resolve(__dirname, '..', 'src', 'registry.ts');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.post('/save-component', (req, res) => {
  const { name, code, framework, category, subcategory, tags, dependencies } = req.body;

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
    framework: framework || 'unknown',
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
