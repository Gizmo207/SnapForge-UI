import type { RegistryItem } from '../registry'

export const FILE_SERVICE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '')

console.log('PROD API BASE:', FILE_SERVICE_URL)

if (!FILE_SERVICE_URL) {
  throw new Error('VITE_API_BASE_URL missing in production build')
}
type ExportFramework = 'react' | 'html'

type ExportZipComponent = {
  componentDir: string
  source?: string
  htmlSource?: string
  cssSource?: string
  meta?: {
    name?: string
    dependencies?: string[]
  }
}

export type SavePayload = {
  name: string
  code: string
  htmlSource?: string
  cssSource?: string
  framework: string
  category: string
  subcategory: string
  tags: string[]
  dependencies: string[]
}

type ComponentCatalogItem = {
  path: string
  componentDir: string
  source?: string
  htmlSource?: string
  cssSource?: string
  meta?: {
    name: string
    category: string
    subcategory: string
    type: string
    tags: string[]
    dependencies: string[]
  }
}

async function parseJsonResponse(res: Response) {
  const data = await res.json()
  if (!res.ok) {
    const message = typeof data?.message === 'string' ? data.message : `Request failed (${res.status})`
    throw new Error(message)
  }
  return data
}

export async function saveComponent(payload: SavePayload) {
  const res = await fetch(`${FILE_SERVICE_URL}/save-component`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseJsonResponse(res)
}

export async function fetchComponents(): Promise<RegistryItem[]> {
  const res = await fetch(`${FILE_SERVICE_URL}/components`)
  const data = await parseJsonResponse(res)
  const items = (data.items || []) as ComponentCatalogItem[]
  return items.map((item) => ({
    path: item.path,
    componentDir: item.componentDir,
    component: undefined,
    source: item.source,
    htmlSource: item.htmlSource,
    cssSource: item.cssSource,
    meta: item.meta,
  }))
}

export async function deleteComponent(filePath: string) {
  const res = await fetch(`${FILE_SERVICE_URL}/delete-component`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath }),
  })
  return parseJsonResponse(res)
}

export async function postprocessComponent(filePath: string) {
  const res = await fetch(`${FILE_SERVICE_URL}/api/postprocess-component`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath }),
  })
  return parseJsonResponse(res)
}

export async function exportZip(components: ExportZipComponent[], framework: ExportFramework): Promise<Blob> {
  const res = await fetch(`${FILE_SERVICE_URL}/export-zip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ components, framework }),
  })

  if (!res.ok) {
    let message = `Export failed (${res.status})`
    try {
      const data = await res.json()
      if (typeof data?.message === 'string') message = data.message
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message)
  }

  return res.blob()
}
