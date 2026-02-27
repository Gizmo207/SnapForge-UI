import { sanitize } from '../engine/sanitizer/sanitize'

const PREVIEW_BLOCKLIST = ['<script', 'window.', 'document.', 'eval(']
export const PREVIEW_RESIZE_EVENT = 'SNAPFORGE_PREVIEW_RESIZE'
export const PREVIEW_STATUS_EVENT = 'SNAPFORGE_PREVIEW_STATUS'
export type PreviewTheme = 'light' | 'neutral' | 'dark'
export type AppThemeMode = 'light' | 'dark'

export function isUnsafePreviewSource(sourceCode: string): boolean {
  const lower = sourceCode.toLowerCase()
  return PREVIEW_BLOCKLIST.some((token) => lower.includes(token))
}

function serializeForTemplate(input: string): string {
  return JSON.stringify(input)
}

function getBasePreviewCss(): string {
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
    .preview-canvas {
      width: 100%;
      height: 100%;
      min-height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 22px;
      overflow: hidden;
      box-sizing: border-box;
    }
    .preview-center {
      width: 100%;
      height: 100%;
      min-height: 160px;
      display: flex;
      align-items: center;
      justify-content: center;
      transform-origin: center;
    }
    .preview-center > * {
      max-width: 100%;
      max-height: 100%;
      margin: 0 auto;
    }
    .preview-theme-light .preview-canvas {
      background: #ffffff;
      color: #0f172a;
    }
    .preview-theme-neutral .preview-canvas {
      background: #e5e7eb;
      color: #0f172a;
    }
    .preview-theme-dark .preview-canvas {
      background: #0f1117;
      color: #e5e7eb;
    }
  `
}

export function inferPreviewTheme(tags: string[] = [], source = '', appThemeMode?: AppThemeMode): PreviewTheme {
  const tagSet = new Set(tags.map((tag) => tag.toLowerCase()))
  const src = source.toLowerCase()

  const darkSignals = ['dark', 'neon', 'cyber', 'glow', 'terminal', 'matrix']
  const lightSignals = ['light', 'paper', 'minimal', 'clean', 'soft', 'white']

  if (darkSignals.some((signal) => tagSet.has(signal))) return 'dark'
  if (lightSignals.some((signal) => tagSet.has(signal))) return 'light'

  const hasExplicitDarkBackground =
    /background(?:-color)?\s*:\s*(?:black|#000(?:000)?|rgb\(\s*0\s*,\s*0\s*,\s*0\s*\)|rgba\(\s*0\s*,\s*0\s*,\s*0\s*,)/i.test(src)
  const hasExplicitLightBackground =
    /background(?:-color)?\s*:\s*(?:white|#fff(?:fff)?|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)|rgba\(\s*255\s*,\s*255\s*,\s*255\s*,)/i.test(src)

  if (hasExplicitDarkBackground) return 'dark'
  if (hasExplicitLightBackground) return 'light'
  if (appThemeMode === 'dark') return 'dark'
  if (appThemeMode === 'light') return 'light'
  return 'neutral'
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
        const stage = document.querySelector('.preview-canvas');
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

export function generateReactPreviewHtml(sourceCode: string, previewId: string, theme: PreviewTheme = 'neutral'): string {
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
      <style>${getBasePreviewCss()}</style>
    </head>
    <body class="${bodyClass}">
      <div id="preview-root">
        <div class="preview-canvas">
          <div id="root" class="preview-center"></div>
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
          const canvas = document.querySelector('.preview-canvas');
          const center = document.getElementById('root');

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
          if (canvas instanceof HTMLElement) {
            if (!canvas.style.width) canvas.style.width = '100%';
            if (!canvas.style.height) canvas.style.height = '100%';
            if (!canvas.style.minHeight) canvas.style.minHeight = '120px';
            if (!canvas.style.display) canvas.style.display = 'flex';
            if (!canvas.style.alignItems) canvas.style.alignItems = 'center';
            if (!canvas.style.justifyContent) canvas.style.justifyContent = 'center';
            if (!canvas.style.boxSizing) canvas.style.boxSizing = 'border-box';
          }
          if (center instanceof HTMLElement) {
            if (!center.style.width) center.style.width = '100%';
            if (!center.style.height) center.style.height = '100%';
            if (!center.style.minHeight) center.style.minHeight = '160px';
            if (!center.style.display) center.style.display = 'flex';
            if (!center.style.alignItems) center.style.alignItems = 'center';
            if (!center.style.justifyContent) center.style.justifyContent = 'center';
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
        function __snapforgeNudgeCollapsedRoot() {
          if (typeof window.__snapforgeEnsureLayoutFallback === 'function') {
            window.__snapforgeEnsureLayoutFallback();
          }
          const mount = document.getElementById('root');
          const first = mount ? mount.firstElementChild : null;
          if (!first) return;
          const rect = first.getBoundingClientRect ? first.getBoundingClientRect() : null;
          if (!rect || rect.width >= 2 && rect.height >= 2) return;

          if (first instanceof HTMLElement) {
            if (!first.style.width) first.style.width = '100%';
            if (!first.style.height) first.style.height = '100%';
            __snapforgeReportSize();
            return;
          }

          if (first instanceof SVGElement) {
            if (!first.getAttribute('width')) first.setAttribute('width', '100%');
            if (!first.getAttribute('height')) first.setAttribute('height', '100%');
            __snapforgeReportSize();
          }
        }
        try {
          if (Component) {
            root.render(React.createElement(Component));
            if (window.requestAnimationFrame) {
              window.requestAnimationFrame(__snapforgeNudgeCollapsedRoot);
            } else {
              setTimeout(__snapforgeNudgeCollapsedRoot, 30);
            }
            setTimeout(__snapforgeNudgeCollapsedRoot, 140);
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
): string {
  const bodyClass = `preview-theme-${theme}`
  return `<!doctype html><html><head><meta charset="utf-8"/><style>${getBasePreviewCss()} ${cssSource || ''}</style></head><body class="${bodyClass}"><div id="preview-root"><div class="preview-canvas"><div class="preview-center">${htmlSource}</div></div></div>
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
