import type { RegistryItem } from '../../registry'
import type { ExportFramework, HtmlExportBundle } from '../../pure/exportBundles'
import { getComponentLabel } from '../../pure/exportBundles'
import { s } from '../styles'

type ExportModalProps = {
  selectedItems: RegistryItem[]
  manifest: { summary: { totalPackages: number } }
  manifestJSON: string
  reactBundle: string
  htmlBundle: HtmlExportBundle
  exportFramework: ExportFramework
  onClose: () => void
  onSetExportFramework: (value: ExportFramework) => void
  onDownloadZip: () => void
  downloadInProgress: boolean
  onDone: () => void
}

export function ExportModal({
  selectedItems,
  manifest,
  manifestJSON,
  reactBundle,
  htmlBundle,
  exportFramework,
  onClose,
  onSetExportFramework,
  onDownloadZip,
  downloadInProgress,
  onDone,
}: ExportModalProps) {
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={{ ...s.modal, maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Export {selectedItems.length} Component{selectedItems.length !== 1 ? 's' : ''}</div>
          <button onClick={onClose} style={s.modalClose}>x</button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--text-subtle)', marginBottom: 8 }}>Selected Components</div>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
              {selectedItems.map((item) => (
                <div key={item.path} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, background: 'var(--brand-bg)', color: 'var(--brand-text)' }}>
                  {getComponentLabel(item)}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--text-subtle)' }}>
              Framework
            </div>
            <select
              value={exportFramework}
              onChange={(e) => onSetExportFramework(e.target.value as ExportFramework)}
              style={{
                ...s.formInput,
                width: 180,
                padding: '6px 10px',
                fontSize: 12,
                background: 'var(--surface-input)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="react" style={{ color: 'var(--text-primary)', background: 'var(--surface-modal)' }}>React</option>
              <option value="html" style={{ color: 'var(--text-primary)', background: 'var(--surface-modal)' }}>HTML + CSS</option>
            </select>
          </div>

          {exportFramework === 'react' ? (
            <>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--text-subtle)', marginBottom: 8 }}>
                  react.tsx Bundle
                </div>
                <pre style={{ ...s.codeBlock, maxHeight: 220 }}><code>{reactBundle}</code></pre>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--text-subtle)', marginBottom: 8 }}>
                  Dependency Manifest ({manifest.summary.totalPackages} package{manifest.summary.totalPackages !== 1 ? 's' : ''})
                </div>
                <pre style={{ ...s.codeBlock, maxHeight: 200 }}><code>{manifestJSON}</code></pre>
              </div>
            </>
          ) : (
            <>
              {htmlBundle.missingNames.length > 0 && (
                <div style={{
                  fontSize: 12,
                  color: 'rgba(255,220,150,0.9)',
                  background: 'rgba(255,180,80,0.08)',
                  border: '1px solid rgba(255,180,80,0.22)',
                  borderRadius: 10,
                  padding: '10px 12px',
                  lineHeight: 1.5,
                }}>
                  HTML variant not available for: {htmlBundle.missingNames.join(', ')}.
                </div>
              )}

              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--text-subtle)', marginBottom: 8 }}>
                  index.html ({htmlBundle.availableCount} component{htmlBundle.availableCount !== 1 ? 's' : ''})
                </div>
                <pre style={{ ...s.codeBlock, maxHeight: 200 }}><code>{htmlBundle.indexHtml}</code></pre>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--text-subtle)', marginBottom: 8 }}>
                  styles.css
                </div>
                <pre style={{ ...s.codeBlock, maxHeight: 200 }}><code>{htmlBundle.stylesCss}</code></pre>
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button style={s.submitBtn} onClick={onDownloadZip} disabled={downloadInProgress}>
              {downloadInProgress ? 'Preparing ZIP...' : 'Download ZIP'}
            </button>
            <button
              style={{ ...s.submitBtn, background: 'var(--surface-button)', borderColor: 'var(--border-strong)', color: 'var(--text-muted)' }}
              onClick={onDone}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
