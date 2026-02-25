import { createElement } from 'react'
import type { RegistryItem } from '../../registry'
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
                background: !showCode ? 'rgba(140,130,255,0.15)' : 'rgba(255,255,255,0.05)',
                borderColor: !showCode ? 'rgba(140,130,255,0.3)' : 'rgba(255,255,255,0.1)',
              }}
              onClick={onShowPreview}
            >
              Preview
            </button>
            <button
              style={{
                ...s.modalTab,
                background: showCode ? 'rgba(140,130,255,0.15)' : 'rgba(255,255,255,0.05)',
                borderColor: showCode ? 'rgba(140,130,255,0.3)' : 'rgba(255,255,255,0.1)',
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
              <div style={s.previewArea}>{item.component && createElement(item.component, { key: `modal-${item.path}` })}</div>
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
                    <span key={d} style={{ ...s.metaTag, background: 'rgba(100,200,255,0.1)', color: 'rgba(150,220,255,0.8)' }}>{d}</span>
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
