import { createElement, useEffect, useMemo, useState } from 'react'
import type { RegistryItem } from '../../registry'
import {
  generateHtmlPreviewHtml,
  generateReactPreviewHtml,
  isUnsafePreviewSource,
  PREVIEW_RESIZE_EVENT,
} from '../../utils/reactPreviewEngine'
import { s } from '../styles'

type DetailModalProps = {
  item: RegistryItem
  showCode: boolean
  copied: boolean
  onClose: () => void
  onShowPreview: () => void
  onShowCode: () => void
  onCopyCode: () => void
  onDelete: () => void
}

export function DetailModal({
  item,
  showCode,
  copied,
  onClose,
  onShowPreview,
  onShowCode,
  onCopyCode,
  onDelete,
}: DetailModalProps) {
  const [iframeHeight, setIframeHeight] = useState(320)
  const previewId = useMemo(() => `modal-${item.path}`, [item.path])
  const framework = item.meta?.type === 'react' ? 'react' : 'html'
  const hasReactPreview = framework === 'react' && Boolean(item.source) && !isUnsafePreviewSource(item.source || '')
  const hasHtmlPreview = framework === 'html' && Boolean(item.htmlSource)
  const hasPreview = hasReactPreview || hasHtmlPreview || Boolean(item.component)

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; previewId?: string; height?: number } | undefined
      if (!data || data.type !== PREVIEW_RESIZE_EVENT || data.previewId !== previewId) return
      if (typeof data.height === 'number' && Number.isFinite(data.height)) {
        setIframeHeight(Math.max(180, Math.ceil(data.height)))
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [previewId])

  const srcDoc = hasReactPreview
    ? generateReactPreviewHtml(item.source || '', previewId)
    : hasHtmlPreview
      ? generateHtmlPreviewHtml(item.htmlSource || '', item.cssSource || '', previewId)
      : undefined

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{item.meta?.name}</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              style={{
                ...s.modalTab,
                background: !showCode ? 'var(--brand-bg)' : 'var(--surface-input)',
                borderColor: !showCode ? 'var(--brand-border)' : 'var(--border-strong)',
                opacity: hasPreview ? 1 : 0.5,
                cursor: hasPreview ? 'pointer' : 'not-allowed',
              }}
              onClick={hasPreview ? onShowPreview : undefined}
            >
              Preview
            </button>
            <button
              style={{
                ...s.modalTab,
                background: showCode ? 'var(--brand-bg)' : 'var(--surface-input)',
                borderColor: showCode ? 'var(--brand-border)' : 'var(--border-strong)',
              }}
              onClick={onShowCode}
            >
              Code
            </button>
            <button onClick={onClose} style={s.modalClose}>x</button>
          </div>
        </div>

        <div style={s.modalContent}>
          <div style={s.modalMain}>
            {showCode ? (
              <div style={{ position: 'relative' as const }}>
                <button
                  onClick={onCopyCode}
                  style={s.copyBtn}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <pre style={s.codeBlock}><code>{item.source}</code></pre>
              </div>
            ) : (
              <div style={s.previewArea}>
                {srcDoc ? (
                  <iframe
                    title={`${item.meta?.name || item.path}-modal-preview`}
                    sandbox="allow-scripts"
                    srcDoc={srcDoc}
                    style={{ width: '100%', height: iframeHeight, border: 'none', background: 'transparent' }}
                  />
                ) : item.component
                  ? createElement(item.component, { key: `modal-${item.path}` })
                  : <div style={{ opacity: 0.5, fontSize: 12 }}>Preview unavailable in remote catalog mode.</div>}
              </div>
            )}
          </div>

          <div style={s.modalMeta}>
            <div style={s.metaSection}>
              <div style={s.metaLabel}>Category</div>
              <div style={s.metaValue}>{item.meta?.category}</div>
            </div>
            <div style={s.metaSection}>
              <div style={s.metaLabel}>Subcategory</div>
              <div style={s.metaValue}>{item.meta?.subcategory}</div>
            </div>
            <div style={s.metaSection}>
              <div style={s.metaLabel}>Type</div>
              <div style={s.metaValue}>{item.meta?.type}</div>
            </div>
            <div style={s.metaSection}>
              <div style={s.metaLabel}>Tags</div>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
                {item.meta?.tags?.map((t) => (
                  <span key={t} style={s.metaTag}>{t}</span>
                ))}
              </div>
            </div>
            {item.meta?.dependencies && item.meta.dependencies.length > 0 && (
              <div style={s.metaSection}>
                <div style={s.metaLabel}>Dependencies</div>
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
                  {item.meta?.dependencies?.map((d) => (
                    <span key={d} style={{ ...s.metaTag, background: 'rgba(100,200,255,0.1)', color: 'var(--text-secondary)' }}>{d}</span>
                  ))}
                </div>
              </div>
            )}
            <div style={s.metaSection}>
              <div style={s.metaLabel}>File</div>
              <div style={{ ...s.metaValue, fontSize: 11, wordBreak: 'break-all' as const }}>
                {item.path}
              </div>
            </div>
            <button
              style={s.deleteBtn}
              onClick={onDelete}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,80,80,0.2)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,80,80,0.08)' }}
            >
              Delete Component
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
