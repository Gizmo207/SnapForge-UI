import { createElement, useEffect, useMemo, useState } from 'react'
import type { RegistryItem } from '../registry'
import {
  generateHtmlPreviewHtml,
  generateReactPreviewHtml,
  inferPreviewTheme,
  isUnsafePreviewSource,
  PREVIEW_STATUS_EVENT,
} from '../utils/reactPreviewEngine'
import { s } from './styles'

const GALLERY_PREVIEW_FRAME_HEIGHT = 248

type GalleryCardProps = {
  item: RegistryItem
  exportMode?: boolean
  exportChecked?: boolean
  onExportToggle?: () => void
  onOpenPreview: () => void
  onOpenCode: () => void
}

export function GalleryCard({ item, exportMode, exportChecked, onExportToggle, onOpenPreview, onOpenCode }: GalleryCardProps) {
  const [hovered, setHovered] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const Component = item.component
  const previewId = useMemo(() => `card-${item.path}`, [item.path])
  const framework = item.meta?.type === 'react' ? 'react' : 'html'
  const hasReactPreview = framework === 'react' && Boolean(item.source) && !isUnsafePreviewSource(item.source || '')
  const hasHtmlPreview = framework === 'html' && Boolean(item.htmlSource)
  const hasPreview = hasReactPreview || hasHtmlPreview || Boolean(Component)
  const previewTheme = inferPreviewTheme(item.meta?.tags || [], item.source || item.htmlSource || '')
  const srcDoc = hasReactPreview
    ? generateReactPreviewHtml(item.source || '', previewId, previewTheme)
    : hasHtmlPreview
      ? generateHtmlPreviewHtml(item.htmlSource || '', item.cssSource || '', previewId, previewTheme)
      : undefined

  useEffect(() => {
    if (!srcDoc) {
      setPreviewLoading(false)
      setPreviewError(null)
      return
    }
    setPreviewLoading(true)
    setPreviewError(null)
  }, [srcDoc])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as {
        type?: string
        previewId?: string
        status?: string
        message?: string
      } | undefined
      if (!data || data.previewId !== previewId) return

      if (data.type === PREVIEW_STATUS_EVENT) {
        if (data.status === 'ready') setPreviewLoading(false)
        if (data.status === 'error') {
          setPreviewLoading(false)
          setPreviewError(data.message || 'Preview failed')
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [previewId])

  return (
    <div
      style={{
        ...s.card,
        cursor: exportMode ? 'pointer' : 'default',
        borderColor: exportChecked ? 'rgba(100,220,140,0.4)' : hovered ? 'var(--border-strong)' : 'var(--border-subtle)',
        transform: hovered ? 'translateY(-3px) scale(1.008)' : 'translateY(0) scale(1)',
        boxShadow: exportChecked ? '0 0 20px rgba(100,220,140,0.1)' : hovered ? '0 12px 32px rgba(0,0,0,0.4)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={exportMode ? onExportToggle : undefined}
    >
      {exportMode && (
        <div style={{
          position: 'absolute' as const, top: 10, left: 10, zIndex: 3,
          width: 20, height: 20, borderRadius: 6,
          border: exportChecked ? '2px solid rgba(100,220,140,0.8)' : '2px solid var(--border-strong)',
          background: exportChecked ? 'rgba(100,220,140,0.3)' : 'var(--surface-code)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, color: '#8fffb0',
        }}>
          {exportChecked ? '✓' : ''}
        </div>
      )}
      <div style={{ ...s.cardPreview, padding: srcDoc ? 12 : 0, height: srcDoc ? GALLERY_PREVIEW_FRAME_HEIGHT + 24 : s.cardPreview.height }}>
        {srcDoc ? (
          <>
            <iframe
              title={`${item.meta?.name || item.path}-preview`}
              sandbox="allow-scripts"
              srcDoc={srcDoc}
              style={{
                width: '100%',
                height: GALLERY_PREVIEW_FRAME_HEIGHT,
                border: '1px solid var(--border-subtle)',
                borderRadius: 10,
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
                background: previewTheme === 'light' ? '#ffffff' : previewTheme === 'dark' ? '#0f1117' : '#e5e7eb',
                pointerEvents: exportMode || previewLoading || Boolean(previewError) ? 'none' : 'auto',
              }}
            />
            {previewLoading && (
              <div style={s.previewOverlay}>
                <div style={s.previewSpinner} />
                <div style={s.previewOverlayText}>Loading preview...</div>
              </div>
            )}
            {previewError && (
              <div style={s.previewOverlay}>
                <div style={s.previewErrorTitle}>Preview failed</div>
                <div style={s.previewErrorText}>{previewError}</div>
              </div>
            )}
          </>
        ) : Component ? (
          createElement(Component)
        ) : (
          <div style={{ opacity: 0.45, fontSize: 12 }}>Preview unavailable</div>
        )}
        {hovered && !exportMode && (
          <div
            style={{
              position: 'absolute',
              top: 18,
              right: 18,
              display: 'flex',
              gap: 6,
              zIndex: 5,
            }}
          >
            {hasPreview && (
              <button
                style={s.cardBtn}
                onClick={onOpenPreview}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(140,130,255,0.22)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-button)' }}
              >
                Preview
              </button>
            )}
            <button
              style={s.cardBtn}
              onClick={onOpenCode}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(140,130,255,0.22)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-button)' }}
            >
              Code
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
