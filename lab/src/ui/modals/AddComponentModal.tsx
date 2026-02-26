import { useState } from 'react'
import type React from 'react'
import { parseComponent } from '../../parser/parseComponent'
import { ValidationBadge, ValidationPanel, type PostprocessResult } from '../../components/ValidationStatus'
import { copyToClipboard } from '../../services/clipboardService'
import { postprocessComponent, saveComponent } from '../../services/fileServiceClient'
import { s } from '../styles'

type AddComponentModalProps = {
  onClose: () => void
  showToast: (msg: string, type: 'success' | 'error') => void
}

export function AddComponentModal({ onClose, showToast }: AddComponentModalProps) {
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={{ ...s.modal, maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Add Component</div>
          <button onClick={onClose} style={s.modalClose}>x</button>
        </div>
        <AddComponentForm onClose={onClose} showToast={showToast} />
      </div>
    </div>
  )
}

function AddComponentForm({ onClose, showToast }: { onClose: () => void; showToast: (msg: string, type: 'success' | 'error') => void }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [parsed, setParsed] = useState<ReturnType<typeof parseComponent> | null>(null)
  const [postprocessResult, setPostprocessResult] = useState<PostprocessResult | null>(null)
  const [saving, setSaving] = useState(false)

  const handleAnalyze = () => {
    if (!code.trim()) return
    const result = parseComponent(code)
    setParsed(result)
  }

  const handleConfirm = async () => {
    if (!parsed || saving) return
    setSaving(true)
    const payload = { ...parsed, name: name || parsed.name, code }
    let relativePath = ''
    try {
      const result = await saveComponent(payload)
      showToast(`Saved to ${result.relativePath}`, 'success')
      relativePath = result.relativePath
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Save failed', 'error')
      setSaving(false)
      return
    }

    try {
      const ppResult = await postprocessComponent(relativePath)
      setPostprocessResult(ppResult)
      if (ppResult.sanitized) {
        showToast(`Auto-fixed: ${ppResult.appliedRules.join(', ')}`, 'success')
      }
    } catch {
      // Postprocess failure is non-blocking
    }

    setSaving(false)
    onClose()
  }

  const handleBack = () => { setParsed(null); setPostprocessResult(null) }

  const handleCopyErrors = async (text: string) => {
    try {
      await copyToClipboard(text)
      showToast('Errors copied to clipboard', 'success')
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Copy failed', 'error')
    }
  }

  if (postprocessResult) {
    return (
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={addStyles.detectedHeader}>Save Complete</div>
          <ValidationBadge result={postprocessResult} />
        </div>
        <ValidationPanel result={postprocessResult} onCopyErrors={handleCopyErrors} />
        <div style={{ fontSize: 12, opacity: 0.4, textAlign: 'center' as const }}>
          Reloading gallery...
        </div>
      </div>
    )
  }

  if (parsed) {
    return (
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
        <div style={addStyles.detectedHeader}>Detected Classification</div>

        <div style={addStyles.resultGrid}>
          <DetectedRow label="Framework" value={parsed.framework} />
          <DetectedRow label="Category" value={parsed.category} />
          <DetectedRow label="Subcategory" value={parsed.subcategory} />
          <div style={addStyles.resultRow}>
            <span style={addStyles.resultLabel}>Tags</span>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const }}>
              {parsed.tags.length > 0
                ? parsed.tags.map((t) => <span key={t} style={addStyles.resultTag}>{t}</span>)
                : <span style={{ fontSize: 12, opacity: 0.3 }}>none detected</span>
              }
            </div>
          </div>
          <div style={addStyles.resultRow}>
            <span style={addStyles.resultLabel}>Dependencies</span>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const }}>
              {parsed.dependencies.length > 0
                ? parsed.dependencies.map((d) => <span key={d} style={{ ...addStyles.resultTag, background: 'rgba(100,200,255,0.12)', color: 'rgba(150,220,255,0.8)' }}>{d}</span>)
                : <span style={{ fontSize: 12, opacity: 0.3 }}>none</span>
              }
            </div>
          </div>
          <DetectedRow label="Name" value={name || parsed.name} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button style={s.submitBtn} onClick={handleConfirm}>
            {saving ? 'Saving...' : 'Confirm & Save'}
          </button>
          <button style={addStyles.backBtn} onClick={handleBack}>
            Edit
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
      <FormField label="Name (optional)" value={name} onChange={setName} placeholder="Auto-detected if left blank" />
      <div>
        <div style={s.formLabel}>Code</div>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste your component code here..."
          style={{ ...s.formInput, minHeight: 200, resize: 'vertical' as const, fontFamily: 'monospace', fontSize: 12 }}
        />
      </div>
      <button style={s.submitBtn} onClick={handleAnalyze}>
        Analyze Component
      </button>
    </div>
  )
}

function DetectedRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={addStyles.resultRow}>
      <span style={addStyles.resultLabel}>{label}</span>
      <span style={addStyles.resultValue}>{value}</span>
    </div>
  )
}

function FormField({ label, value, onChange, placeholder }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <div>
      <div style={s.formLabel}>{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={s.formInput}
      />
    </div>
  )
}

const addStyles: Record<string, React.CSSProperties> = {
  detectedHeader: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--brand-text)',
    letterSpacing: '0.02em',
  },
  resultGrid: {
    background: 'var(--surface-input)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 12,
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 10,
  },
  resultRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultLabel: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    color: 'var(--text-subtle)',
  },
  resultValue: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    textTransform: 'capitalize' as const,
  },
  resultTag: {
    fontSize: 10,
    padding: '2px 8px',
    borderRadius: 4,
    background: 'var(--brand-bg)',
    color: 'var(--brand-text)',
  },
  backBtn: {
    padding: '10px 20px',
    fontSize: 13,
    fontWeight: 500,
    borderRadius: 10,
    border: '1px solid var(--border-strong)',
    background: 'var(--surface-button)',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
}
