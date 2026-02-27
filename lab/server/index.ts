import express from 'express';
import cors, { type CorsOptions } from 'cors';
import cookieParser from 'cookie-parser';
import { saveComponent, deleteComponent, listComponents, postprocessComponent, initStore } from './fileService.js';
import { exportZipToResponse } from './exportZipService.js';
import {
  buildGoogleAuthStart,
  clearOAuthStateCookie,
  clearSessionCookie,
  getFrontendOrigin,
  initAuthStore,
  OAUTH_STATE_COOKIE_NAME,
  revokeSessionToken,
  SESSION_COOKIE_NAME,
  setOAuthStateCookie,
  setSessionCookie,
  signInWithGoogleAuthCode,
} from './authService.js';
import { requireAuth, type RequestWithAuth } from './authMiddleware.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

const allowedOrigins = new Set(
  (process.env.CORS_ALLOWED_ORIGINS || process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

app.set('trust proxy', 1);
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

const handleListComponents: express.RequestHandler = async (req, res) => {
  const request = req as RequestWithAuth;
  const authUser = request.authUser;
  if (!authUser) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  try {
    const items = await listComponents(authUser.id);
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

app.get('/auth/google/start', (_req, res) => {
  const { state, url } = buildGoogleAuthStart();
  setOAuthStateCookie(res, state);
  res.redirect(url);
});

app.get('/auth/google/callback', async (req, res) => {
  const code = typeof req.query.code === 'string' ? req.query.code : undefined;
  const state = typeof req.query.state === 'string' ? req.query.state : undefined;
  const expectedState = req.cookies?.[OAUTH_STATE_COOKIE_NAME] as string | undefined;
  clearOAuthStateCookie(res);

  if (!code || !state || !expectedState || state !== expectedState) {
    const redirectUrl = new URL(getFrontendOrigin());
    redirectUrl.searchParams.set('auth', 'error');
    redirectUrl.searchParams.set('reason', 'oauth_state');
    res.redirect(redirectUrl.toString());
    return;
  }

  try {
    const { sessionToken } = await signInWithGoogleAuthCode(code);
    setSessionCookie(res, sessionToken);
    res.redirect(getFrontendOrigin());
  } catch {
    const redirectUrl = new URL(getFrontendOrigin());
    redirectUrl.searchParams.set('auth', 'error');
    redirectUrl.searchParams.set('reason', 'oauth_callback');
    res.redirect(redirectUrl.toString());
  }
});

app.get('/me', requireAuth, (req, res) => {
  const request = req as RequestWithAuth;
  res.json({ success: true, user: request.authUser });
});

app.post('/logout', async (req, res) => {
  const sessionToken = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
  if (sessionToken) {
    await revokeSessionToken(sessionToken);
  }
  clearSessionCookie(res);
  res.json({ success: true });
});

app.get('/components', requireAuth, handleListComponents);
app.get('/api/components', requireAuth, handleListComponents);

app.post('/save-component', requireAuth, async (req, res) => {
  const request = req as RequestWithAuth;
  const authUser = request.authUser;
  if (!authUser) {
    res.status(401).json({ success: false, status: 'error', message: 'Unauthorized' });
    return;
  }

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
  }, authUser.id);

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

app.delete('/delete-component', requireAuth, async (req, res) => {
  const request = req as RequestWithAuth;
  const authUser = request.authUser;
  if (!authUser) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const { filePath } = req.body;

  if (!filePath) {
    res.status(400).json({ success: false, message: 'Missing filePath' });
    return;
  }

  const result = await deleteComponent(filePath, authUser.id);

  res.status(result.success ? 200 : 404).json(result);
});

app.post('/api/postprocess-component', requireAuth, async (req, res) => {
  const request = req as RequestWithAuth;
  const authUser = request.authUser;
  if (!authUser) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const { filePath } = req.body;

  if (!filePath) {
    res.status(400).json({ success: false, message: 'Missing filePath' });
    return;
  }

  const result = await postprocessComponent(filePath, authUser.id);

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

app.post('/export-zip', requireAuth, (req, res) => {
  exportZipToResponse(req.body, res);
});

async function start() {
  await initAuthStore();
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
