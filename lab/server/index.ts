import express from 'express';
import cors from 'cors';
import { saveComponent, deleteComponent, listComponents, postprocessComponent, initStore } from './fileService.js';
import { exportZipToResponse } from './exportZipService.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

const handleListComponents: express.RequestHandler = async (_req, res) => {
  try {
    const items = await listComponents();
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

app.post('/save-component', async (req, res) => {
  const { name, code, htmlSource, cssSource, framework, category, subcategory, tags, dependencies } = req.body;

  if (!name || !code || !category || !subcategory) {
    res.status(400).json({
      success: false,
      status: 'error',
      message: 'Missing required fields: name, code, category, subcategory',
    });
    return;
  }

  const result = await saveComponent({
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
    res.status(200).json(result);
    return;
  }

  if (result.status === 'duplicate') {
    res.status(409).json(result);
    return;
  }

  res.status(500).json(result);
});

app.delete('/delete-component', async (req, res) => {
  const { filePath } = req.body;

  if (!filePath) {
    res.status(400).json({ success: false, message: 'Missing filePath' });
    return;
  }

  const result = await deleteComponent(filePath);

  res.status(result.success ? 200 : 404).json(result);
});

app.post('/api/postprocess-component', async (req, res) => {
  const { filePath } = req.body;

  if (!filePath) {
    res.status(400).json({ success: false, message: 'Missing filePath' });
    return;
  }

  const result = await postprocessComponent(filePath);

  if (!result.found) {
    res.status(404).json({
      success: false,
      message: `File not found: ${filePath}`,
      sanitized: false,
      appliedRules: [],
      parseOk: false,
      parseErrors: result.parseResult.parseErrors,
    });
    return;
  }

  res.json({
    success: true,
    sanitized: result.sanitized,
    appliedRules: result.appliedRules,
    parseOk: result.parseResult.parseOk,
    parseErrors: result.parseResult.parseErrors,
  });
});

app.post('/export-zip', (req, res) => {
  exportZipToResponse(req.body, res);
});

async function start() {
  await initStore();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`File service running on port ${PORT}`);
  });
}

void start().catch((err) => {
  console.error('Failed to initialize backend:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});
