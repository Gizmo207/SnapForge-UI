const PREVIEW_BLOCKLIST = ['<script', 'window.', 'document.', 'eval(']
export const PREVIEW_RESIZE_EVENT = 'SNAPFORGE_PREVIEW_RESIZE'
export const PREVIEW_STATUS_EVENT = 'SNAPFORGE_PREVIEW_STATUS'

export function isUnsafePreviewSource(sourceCode: string): boolean {
  const lower = sourceCode.toLowerCase()
  return PREVIEW_BLOCKLIST.some((token) => lower.includes(token))
}

function serializeForTemplate(input: string): string {
  return JSON.stringify(input)
}

function buildResizeScript(previewId: string): string {
  const serializedId = serializeForTemplate(previewId)
  return `
      function __snapforgePostStatus(status, message) {
        window.parent.postMessage(
          { type: "${PREVIEW_STATUS_EVENT}", previewId: ${serializedId}, status, message },
          "*"
        );
      }
      function __snapforgeReportSize() {
        const bodyHeight = document.body ? document.body.scrollHeight : 0;
        const docHeight = document.documentElement ? document.documentElement.scrollHeight : 0;
        const height = Math.max(bodyHeight, docHeight, 120);
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
      setTimeout(function() { __snapforgePostStatus('ready', 'ok'); }, 80);
  `
}

export function generateReactPreviewHtml(sourceCode: string, previewId: string): string {
  const withoutImports = sourceCode
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
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
      <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
      <script src="https://unpkg.com/styled-components/dist/styled-components.min.js"></script>
      <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
      <style>
        html, body, #root {
          margin: 0;
          padding: 0;
          width: 100%;
          background: transparent;
        }
        body {
          padding: 16px;
          font-family: sans-serif;
          box-sizing: border-box;
          overflow: hidden;
        }
      </style>
    </head>
    <body>
      <div id="root"></div>

      <script type="text/babel">
        const exports = {};
        const styled = window.styled;
        ${buildResizeScript(previewId)}
        ${safeSource}
        exports.default = ${exportTarget};

        const Component = exports.default || Object.values(exports)[0];
        const root = ReactDOM.createRoot(document.getElementById('root'));
        try {
          if (Component) {
            root.render(React.createElement(Component));
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

export function generateHtmlPreviewHtml(htmlSource: string, cssSource: string, previewId: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"/><style>html,body{margin:0;padding:0;background:transparent;color:inherit;overflow:hidden;}*{box-sizing:border-box;}${cssSource || ''}</style></head><body>${htmlSource}
  <script>
  ${buildResizeScript(previewId)}
  <\/script>
  </body></html>`
}
