import type { RegistryItem } from '../registry'

const DEV_FILE_SERVICE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '')
export const FILE_SERVICE_URL = import.meta.env.PROD ? '/api' : DEV_FILE_SERVICE_URL

console.log('PROD API BASE:', FILE_SERVICE_URL)

if (!FILE_SERVICE_URL) {
  throw new Error('VITE_API_BASE_URL missing for local development')
}
type ExportFramework = 'react' | 'html'
type UserTier = 'free' | 'library' | 'pro'

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

export type CurrentUser = {
  id: string
  email: string
  name: string | null
  avatar: string | null
  tier: UserTier
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

function normalizeSubcategory(value: string | undefined): string | undefined {
  if (!value) return value
  const key = value.trim().toLowerCase()
  if (key === 'radio' || key === 'radios' || key === 'radiobutton' || key === 'radiobuttons' || key === 'radio-button') {
    return 'radio-buttons'
  }
  return value
}

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(message: string, status: number, data: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

async function parseJsonResponse(res: Response) {
  const data = await res.json()
  if (!res.ok) {
    const message = typeof data?.message === 'string' ? data.message : `Request failed (${res.status})`
    throw new ApiError(message, res.status, data)
  }
  return data
}

export async function saveComponent(payload: SavePayload) {
  const res = await fetch(`${FILE_SERVICE_URL}/save-component`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  return parseJsonResponse(res)
}

export async function fetchComponents(): Promise<RegistryItem[]> {
  const endpoints = [`${FILE_SERVICE_URL}/components`]
  let lastError: Error | null = null

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, { credentials: 'include' })
      const data = await parseJsonResponse(res)
      const items = (data.items || []) as ComponentCatalogItem[]
      return items.map((item) => ({
        path: item.path,
        componentDir: item.componentDir,
        component: undefined,
        source: item.source,
        htmlSource: item.htmlSource,
        cssSource: item.cssSource,
        meta: item.meta
          ? {
              ...item.meta,
              subcategory: normalizeSubcategory(item.meta.subcategory) || item.meta.subcategory,
            }
          : item.meta,
      }))
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error('Failed to fetch components')
    }
  }

  throw lastError || new Error('Failed to fetch components')
}

export async function deleteComponent(filePath: string) {
  const res = await fetch(`${FILE_SERVICE_URL}/delete-component`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ filePath }),
  })
  return parseJsonResponse(res)
}

export async function postprocessComponent(filePath: string) {
  const res = await fetch(`${FILE_SERVICE_URL}/postprocess-component`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ filePath }),
  })
  return parseJsonResponse(res)
}

export async function exportZip(components: ExportZipComponent[], framework: ExportFramework): Promise<Blob> {
  const res = await fetch(`${FILE_SERVICE_URL}/export-zip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
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

export async function fetchMe(): Promise<CurrentUser> {
  const res = await fetch(`${FILE_SERVICE_URL}/me`, {
    method: 'GET',
    credentials: 'include',
  })
  const data = await parseJsonResponse(res)
  return data.user as CurrentUser
}

export async function logout(): Promise<void> {
  const res = await fetch(`${FILE_SERVICE_URL}/logout`, {
    method: 'POST',
    credentials: 'include',
  })
  await parseJsonResponse(res)
}

export function getGoogleSignInUrl(): string {
  return `${FILE_SERVICE_URL}/auth/google/start`
}
