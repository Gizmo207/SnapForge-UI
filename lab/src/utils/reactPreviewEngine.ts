import { sanitize } from '../engine/sanitizer/sanitize'

const PREVIEW_BLOCKLIST = ['<script', 'window.', 'document.', 'eval(']
export const PREVIEW_RESIZE_EVENT = 'SNAPFORGE_PREVIEW_RESIZE'
export const PREVIEW_STATUS_EVENT = 'SNAPFORGE_PREVIEW_STATUS'
export type PreviewTheme = 'light' | 'neutral' | 'dark'
export type AppThemeMode = 'light' | 'dark'
export type PreviewLayout = 'gallery' | 'modal'

export function isUnsafePreviewSource(sourceCode: string): boolean {
  const lower = sourceCode.toLowerCase()
  return PREVIEW_BLOCKLIST.some((token) => lower.includes(token))
}

function serializeForTemplate(input: string): string {
  return JSON.stringify(input)
}

function getBasePreviewCss(layout: PreviewLayout = 'modal'): string {
  const stagePadding = layout === 'gallery' ? 14 : 22
  return `
    html, body, #preview-root {
      width: 100%;
      height: 100%;
      min-height: 100%;
      margin: 0;
      padding: 0;
    }
    body {
      overflow: hidden;
      font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    }
    .preview-stage {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 100%;
      display: grid;
      place-items: center;
      padding: ${stagePadding}px;
      overflow: hidden;
      box-sizing: border-box;
    }
    .preview-inner {
      position: relative;
      display: inline-block;
      max-width: 100%;
      max-height: 100%;
      margin: 0 auto;
    }
    .preview-inner > * {
      max-width: 100%;
      max-height: 100%;
      margin: 0 auto;
    }
    .preview-theme-light .preview-stage {
      background: #ffffff;
      color: #0f172a;
    }
    .preview-theme-neutral .preview-stage {
      background: #e5e7eb;
      color: #0f172a;
    }
    .preview-theme-dark .preview-stage {
      background: #0f1117;
      color: #e5e7eb;
    }
  `
}

export function inferPreviewTheme(tags: string[] = [], source = '', _appThemeMode?: AppThemeMode): PreviewTheme {
  const tagSet = new Set(tags.map((tag) => tag.toLowerCase()))
  const src = source.toLowerCase()

  const darkSignals = ['dark', 'neon', 'cyber', 'glow', 'terminal', 'matrix']
  const lightSignals = ['light', 'paper', 'minimal', 'clean', 'soft', 'white']

  if (darkSignals.some((signal) => tagSet.has(signal))) return 'dark'
  if (lightSignals.some((signal) => tagSet.has(signal))) return 'light'

  const backgroundTone = detectBackgroundTone(src)
  if (backgroundTone) return backgroundTone

  const looksLikeLoader =
    tagSet.has('animation') ||
    /\b(loader|spinner|domino|pulse|skeleton|progress)\b/i.test(src)

  if (looksLikeLoader) return 'dark'
  return 'neutral'
}

function detectBackgroundTone(source: string): PreviewTheme | null {
  const declarations = source.match(/background(?:-color)?\s*:\s*([^;]+)/gi) || []
  for (const declaration of declarations) {
    const value = declaration.split(':').slice(1).join(':').trim()
    const color = extractColorToken(value)
    if (!color) continue
    const rgb = parseColorToken(color)
    if (!rgb) continue
    const luminance = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255
    if (luminance <= 0.35) return 'dark'
    if (luminance >= 0.82) return 'light'
  }
  return null
}

function extractColorToken(value: string): string | null {
  const match = value.match(/#(?:[0-9a-f]{3}|[0-9a-f]{6})\b|rgba?\([^)]+\)|\b(?:black|white)\b/i)
  return match ? match[0] : null
}

function parseColorToken(token: string): [number, number, number] | null {
  const lower = token.toLowerCase()
  if (lower === 'black') return [0, 0, 0]
  if (lower === 'white') return [255, 255, 255]

  if (lower.startsWith('#')) {
    const hex = lower.slice(1)
    if (hex.length === 3) {
      return [
        Number.parseInt(hex[0] + hex[0], 16),
        Number.parseInt(hex[1] + hex[1], 16),
        Number.parseInt(hex[2] + hex[2], 16),
      ]
    }
    if (hex.length === 6) {
      return [
        Number.parseInt(hex.slice(0, 2), 16),
        Number.parseInt(hex.slice(2, 4), 16),
        Number.parseInt(hex.slice(4, 6), 16),
      ]
    }
    return null
  }

  const rgbMatch = lower.match(/rgba?\(([^)]+)\)/)
  if (!rgbMatch) return null
  const parts = rgbMatch[1].split(',').map((part) => Number.parseFloat(part.trim()))
  if (parts.length < 3 || parts.slice(0, 3).some((part) => Number.isNaN(part))) return null
  return [parts[0], parts[1], parts[2]]
}

function buildResizeScript(previewId: string): string {
  const serializedId = serializeForTemplate(previewId)
  return `
      window.__snapforgePreviewReady = false;
      function __snapforgePostStatus(status, message) {
        if (status === 'ready' || status === 'error') {
          window.__snapforgePreviewReady = true;
        }
        window.parent.postMessage(
          { type: "${PREVIEW_STATUS_EVENT}", previewId: ${serializedId}, status, message },
          "*"
        );
      }
      function __snapforgeReportSize() {
        const stage = document.querySelector('.preview-stage');
        const stageHeight = stage && stage.scrollHeight ? stage.scrollHeight : 0;
        const bodyHeight = document.body ? document.body.scrollHeight : 0;
        const docHeight = document.documentElement ? document.documentElement.scrollHeight : 0;
        const height = Math.max(bodyHeight, docHeight, stageHeight, 120);
        window.parent.postMessage(
          { type: "${PREVIEW_RESIZE_EVENT}", previewId: ${serializedId}, height },
          "*"
        );
      }
      window.addEventListener('error', function(event) {
        const message = event && event.error && event.error.message
          ? event.error.message
          : (event && event.message ? event.message : 'Preview runtime error');
        __snapforgePostStatus('error', message);
      });
      window.addEventListener('unhandledrejection', function(event) {
        const reason = event && event.reason ? event.reason : 'Unhandled promise rejection';
        __snapforgePostStatus('error', String(reason));
      });
      setTimeout(__snapforgeReportSize, 50);
      window.addEventListener('load', __snapforgeReportSize);
      if (window.ResizeObserver) {
        const __snapforgeObserver = new ResizeObserver(__snapforgeReportSize);
        __snapforgeObserver.observe(document.body);
      }
      window.__snapforgeMarkReady = function() {
        __snapforgePostStatus('ready', 'ok');
      };
      setTimeout(function() {
        if (!window.__snapforgePreviewReady) {
          __snapforgePostStatus('error', 'Preview initialization timed out');
        }
      }, 3500);
  `
}

export function generateReactPreviewHtml(
  sourceCode: string,
  previewId: string,
  theme: PreviewTheme = 'neutral',
  layout: PreviewLayout = 'modal',
): string {
  const sanitizedSource = sanitize(sourceCode).source
  const withoutImports = sanitizedSource
    .split('\n')
    .filter((line) => !line.trim().startsWith('import '))
    .join('\n')

  const defaultFunctionMatch = withoutImports.match(/export\s+default\s+function\s+([A-Za-z_]\w*)/)
  const defaultClassMatch = withoutImports.match(/export\s+default\s+class\s+([A-Za-z_]\w*)/)
  const defaultIdentifierMatch = withoutImports.match(/export\s+default\s+([A-Za-z_]\w*)\s*;?/)

  let rewritten = withoutImports
    .replace(/export\s+default\s+function\s+/g, 'function ')
    .replace(/export\s+default\s+class\s+/g, 'class ')
    .replace(/export\s+const\s+/g, 'const ')
    .replace(/export\s+function\s+/g, 'function ')

  if (defaultIdentifierMatch) {
    rewritten = rewritten.replace(/export\s+default\s+([A-Za-z_]\w*)\s*;?/g, '')
  }

  const exportTarget =
    defaultFunctionMatch?.[1] ||
    defaultClassMatch?.[1] ||
    defaultIdentifierMatch?.[1] ||
    'null'

  const safeSource = rewritten.replace(/<\/script>/gi, '<\\/script>')
  const bodyClass = `preview-theme-${theme}`
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
      <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
      <script src="https://unpkg.com/styled-components/dist/styled-components.min.js"></script>
      <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
      <style>${getBasePreviewCss(layout)}</style>
    </head>
    <body class="${bodyClass}">
      <div id="preview-root">
        <div class="preview-stage">
          <div id="root" class="preview-inner"></div>
        </div>
      </div>

      <script>
        window.__snapforgePreviewExports = {};
        window.__snapforgePreviewStyled = window.styled;
        ${buildResizeScript(previewId)}
        window.__snapforgeEnsureLayoutFallback = function() {
          const docEl = document.documentElement;
          const body = document.body;
          const previewRoot = document.getElementById('preview-root');
          const stage = document.querySelector('.preview-stage');
          const inner = document.getElementById('root');

          if (docEl) {
            docEl.style.width = '100%';
            docEl.style.height = '100%';
          }
          if (body) {
            body.style.width = '100%';
            body.style.height = '100%';
            body.style.margin = '0';
          }
          if (previewRoot instanceof HTMLElement) {
            if (!previewRoot.style.width) previewRoot.style.width = '100%';
            if (!previewRoot.style.height) previewRoot.style.height = '100%';
          }
          if (stage instanceof HTMLElement) {
            if (!stage.style.width) stage.style.width = '100%';
            if (!stage.style.height) stage.style.height = '100%';
            if (!stage.style.minHeight) stage.style.minHeight = '120px';
            if (!stage.style.display) stage.style.display = 'grid';
            if (!stage.style.placeItems) stage.style.placeItems = 'center';
            if (!stage.style.boxSizing) stage.style.boxSizing = 'border-box';
          }
          if (inner instanceof HTMLElement) {
            if (!inner.style.position) inner.style.position = 'relative';
            if (!inner.style.display) inner.style.display = 'inline-block';
            if (!inner.style.maxWidth) inner.style.maxWidth = '100%';
            if (!inner.style.maxHeight) inner.style.maxHeight = '100%';
          }
        };
        window.__snapforgeEnsureLayoutFallback();
      </script>

      <script type="text/babel">
        const exports = window.__snapforgePreviewExports || {};
        const styled = window.__snapforgePreviewStyled || window.styled;
        ${safeSource}
        exports.default = ${exportTarget};

        const Component = exports.default || Object.values(exports)[0];
        const root = ReactDOM.createRoot(document.getElementById('root'));
        try {
          if (Component) {
            root.render(React.createElement(Component));
            setTimeout(function() {
              if (typeof window.__snapforgeMarkReady === 'function') {
                window.__snapforgeMarkReady();
              } else {
                __snapforgePostStatus('ready', 'ok');
              }
            }, 80);
          } else {
            throw new Error('No default component export found for preview');
          }
        } catch (error) {
          __snapforgePostStatus('error', error && error.message ? error.message : 'Render failed');
        }
      </script>
    </body>
  </html>
  `;
}

export function generateHtmlPreviewHtml(
  htmlSource: string,
  cssSource: string,
  previewId: string,
  theme: PreviewTheme = 'neutral',
  layout: PreviewLayout = 'modal',
): string {
  const bodyClass = `preview-theme-${theme}`
  return `<!doctype html><html><head><meta charset="utf-8"/><style>${getBasePreviewCss(layout)} ${cssSource || ''}</style></head><body class="${bodyClass}"><div id="preview-root"><div class="preview-stage"><div class="preview-inner">${htmlSource}</div></div></div>
  <script>
  ${buildResizeScript(previewId)}
  setTimeout(function() {
    if (typeof window.__snapforgeMarkReady === 'function') {
      window.__snapforgeMarkReady();
    } else {
      __snapforgePostStatus('ready', 'ok');
    }
  }, 80);
  <\/script>
  </body></html>`
}
