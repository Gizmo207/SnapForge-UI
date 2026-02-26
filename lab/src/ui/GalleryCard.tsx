import { createElement, useEffect, useMemo, useState } from 'react'
import type { RegistryItem } from '../registry'
import {
  generateHtmlPreviewHtml,
  generateReactPreviewHtml,
  isUnsafePreviewSource,
  PREVIEW_RESIZE_EVENT,
  PREVIEW_STATUS_EVENT,
} from '../utils/reactPreviewEngine'
import { s } from './styles'

const MIN_GALLERY_PREVIEW_HEIGHT = 180
const MAX_GALLERY_PREVIEW_HEIGHT = 320

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
  const [iframeHeight, setIframeHeight] = useState(220)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const Component = item.component
  const previewId = useMemo(() => `card-${item.path}`, [item.path])
  const framework = item.meta?.type === 'react' ? 'react' : 'html'
  const hasReactPreview = framework === 'react' && Boolean(item.source) && !isUnsafePreviewSource(item.source || '')
  const hasHtmlPreview = framework === 'html' && Boolean(item.htmlSource)
  const hasPreview = hasReactPreview || hasHtmlPreview || Boolean(Component)
  const effectivePreviewHeight = Math.max(
    MIN_GALLERY_PREVIEW_HEIGHT,
    Math.min(MAX_GALLERY_PREVIEW_HEIGHT, iframeHeight),
  )
  const previewClipped = iframeHeight > MAX_GALLERY_PREVIEW_HEIGHT
  const srcDoc = hasReactPreview
    ? generateReactPreviewHtml(item.source || '', previewId)
    : hasHtmlPreview
      ? generateHtmlPreviewHtml(item.htmlSource || '', item.cssSource || '', previewId)
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
        height?: number
        status?: string
        message?: string
      } | undefined
      if (!data || data.previewId !== previewId) return

      if (data.type === PREVIEW_RESIZE_EVENT && typeof data.height === 'number' && Number.isFinite(data.height)) {
        setIframeHeight(Math.max(120, Math.ceil(data.height)))
        return
      }

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
        borderColor: exportChecked ? 'rgba(100,220,140,0.4)' : hovered ? 'var(--border-strong)' : 'var(--border-subtle)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
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
      <div style={{ ...s.cardPreview, padding: srcDoc ? 12 : 0, height: srcDoc ? effectivePreviewHeight + 24 : s.cardPreview.height }}>
        {srcDoc ? (
          <>
            <iframe
              title={`${item.meta?.name || item.path}-preview`}
              sandbox="allow-scripts"
              srcDoc={srcDoc}
              style={{
                width: '100%',
                height: effectivePreviewHeight,
                border: '1px solid var(--border-subtle)',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.02)',
                pointerEvents: 'none',
              }}
            />
            {previewClipped && !previewLoading && !previewError && (
              <div style={s.previewClipFade}>
                <span style={s.previewClipText}>Open Preview for full height</span>
              </div>
            )}
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
      </div>
      <div style={s.cardInfo}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={s.cardTitle}>{item.meta?.name}</div>
            <div style={s.itemMeta}>{item.meta?.category} {item.meta?.subcategory && `/ ${item.meta.subcategory}`}</div>
          </div>
          {hovered && !exportMode && (
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              {hasPreview && (
                <button
                  style={s.cardBtn}
                  onClick={onOpenPreview}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(140,130,255,0.2)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-button)' }}
                >
                  Preview
                </button>
              )}
              <button
                style={s.cardBtn}
                onClick={onOpenCode}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(140,130,255,0.2)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-button)' }}
              >
                Code
              </button>
            </div>
          )}
        </div>
        {item.meta?.tags && (
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
            {item.meta.tags.slice(0, 3).map((t) => (
              <span key={t} style={s.cardTag}>{t}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
