import type { RegistryItem } from '../registry'

export type ExportFramework = 'react' | 'html'

export type HtmlExportBundle = {
  indexHtml: string
  stylesCss: string
  missingNames: string[]
  availableCount: number
}

function toExportPath(path: string): string {
  return path.replace(/^(\.\.\/)+/, '')
}

export function getComponentLabel(item: RegistryItem): string {
  return item.meta?.name ?? item.componentDir.split('/').pop() ?? 'Unnamed Component'
}

export function buildReactExportBundle(items: RegistryItem[]): string {
  if (items.length === 0) return '// No components selected.'

  return items
    .map((item) => {
      const filePath = `${toExportPath(item.componentDir)}/react.tsx`
      const source = item.source?.trim() || '// react.tsx source unavailable'
      return `// ${filePath}\n${source}`
    })
    .join('\n\n')
}

function indentBlock(text: string, spaces: number): string {
  const prefix = ' '.repeat(spaces)
  return text.split('\n').map((line) => `${prefix}${line}`).join('\n')
}

export function buildHtmlExportBundle(items: RegistryItem[]): HtmlExportBundle {
  const available = items.filter((item) => typeof item.htmlSource === 'string' && item.htmlSource.trim().length > 0)
  const missingNames = items
    .filter((item) => !item.htmlSource || item.htmlSource.trim().length === 0)
    .map(getComponentLabel)

  const bodySections = available.map((item) => {
    const heading = `  <!-- ${getComponentLabel(item)} (${toExportPath(item.componentDir)}/html.html) -->`
    const content = indentBlock(item.htmlSource?.trim() ?? '', 2)
    return `${heading}\n${content}`
  })

  const indexHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Exported Components</title>
  <link rel="stylesheet" href="./styles.css" />
</head>
<body>
${bodySections.length > 0 ? bodySections.join('\n\n') : '  <!-- No HTML variants available for the selected components. -->'}
</body>
</html>`

  const stylesSections = available.map((item) => {
    const heading = `/* ${getComponentLabel(item)} (${toExportPath(item.componentDir)}/styles.css) */`
    const css = item.cssSource?.trim() || '/* No styles.css variant provided for this component. */'
    return `${heading}\n${css}`
  })

  return {
    indexHtml,
    stylesCss: stylesSections.length > 0 ? stylesSections.join('\n\n') : '/* No HTML variants available in this export. */',
    missingNames,
    availableCount: available.length,
  }
}
