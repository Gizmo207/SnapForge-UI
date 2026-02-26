const PREVIEW_BLOCKLIST = ['<script', 'window.', 'document.', 'eval(']

export function isUnsafePreviewSource(sourceCode: string): boolean {
  const lower = sourceCode.toLowerCase()
  return PREVIEW_BLOCKLIST.some((token) => lower.includes(token))
}

export function generateReactPreviewHtml(sourceCode: string): string {
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
      <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
      <style>
        body { margin: 0; padding: 16px; font-family: sans-serif; }
      </style>
    </head>
    <body>
      <div id="root"></div>

      <script type="text/babel">
        const exports = {};
        ${safeSource}
        exports.default = ${exportTarget};

        const Component = exports.default || Object.values(exports)[0];
        const root = ReactDOM.createRoot(document.getElementById('root'));
        if (Component) {
          root.render(React.createElement(Component));
        }
      </script>
    </body>
  </html>
  `;
}
