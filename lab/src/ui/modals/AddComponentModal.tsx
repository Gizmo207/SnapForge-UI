import { useMemo, useState } from 'react'
import type React from 'react'
import { ValidationBadge, ValidationPanel, type PostprocessResult } from '../../components/ValidationStatus'
import { copyToClipboard } from '../../services/clipboardService'
import { ApiError, postprocessComponent, saveComponent } from '../../services/fileServiceClient'
import { isUnsafePreviewSource } from '../../utils/reactPreviewEngine'
import { s } from '../styles'
import { CATEGORY_ORDER, formatTaxonomyLabel, getSubcategoryOptions } from '../../data/componentTaxonomy'
import { classifyComponent } from '../../parser/classifyComponent'
import { detectDependencies } from '../../parser/detectDependencies'
import { inferName } from '../../parser/inferName'

type AddComponentModalProps = {
  onClose: () => void
  showToast: (msg: string, type: 'success' | 'error') => void
  onSaved?: () => void
}

type AnalysisSummary = {
  framework: 'react' | 'html'
  tags: string[]
  dependencies: string[]
  suggestedName: string
}

export function AddComponentModal({ onClose, showToast, onSaved }: AddComponentModalProps) {
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={{ ...s.modal, maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Add Component</div>
          <button onClick={onClose} style={s.modalClose}>x</button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <AddComponentForm onClose={onClose} showToast={showToast} onSaved={onSaved} />
        </div>
      </div>
    </div>
  )
}

function AddComponentForm({
  onClose,
  showToast,
  onSaved,
}: {
  onClose: () => void
  showToast: (msg: string, type: 'success' | 'error') => void
  onSaved?: () => void
}) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [framework, setFramework] = useState<'react' | 'html'>('react')
  const [reactCode, setReactCode] = useState('')
  const [htmlCode, setHtmlCode] = useState('')
  const [cssCode, setCssCode] = useState('')
  const [postprocessResult, setPostprocessResult] = useState<PostprocessResult | null>(null)
  const [saving, setSaving] = useState(false)

  const subcategoryOptions = getSubcategoryOptions(category)
  const activeSource = framework === 'react' ? reactCode : buildHtmlCompositeSource(htmlCode, cssCode)
  const canSave = Boolean(category && subcategory && (framework === 'react' ? reactCode.trim() : htmlCode.trim()))

  const analysis = useMemo<AnalysisSummary | null>(() => {
    if (!activeSource.trim() || !category || !subcategory) return null

    const tags = classifyComponent(activeSource).tags
    const dependencies = framework === 'react' ? detectDependencies(reactCode) : []
    const suggestedName = inferName(activeSource, { category, subcategory, tags })

    return {
      framework,
      tags,
      dependencies,
      suggestedName,
    }
  }, [activeSource, category, cssCode, framework, htmlCode, reactCode, subcategory])

  const handleCategoryChange = (value: string) => {
    setCategory(value)
    const options = getSubcategoryOptions(value)
    setSubcategory(options[0] ?? '')
  }

  const handleConfirm = async () => {
    if (!canSave || saving) return

    const summary = analysis ?? {
      framework,
      tags: classifyComponent(activeSource).tags,
      dependencies: framework === 'react' ? detectDependencies(reactCode) : [],
      suggestedName: inferName(activeSource, { category, subcategory, tags: [] }),
    }

    if (summary.framework === 'react' && isUnsafePreviewSource(reactCode)) {
      showToast('Blocked: preview source contains restricted tokens (<script, window., document., eval().', 'error')
      return
    }

    setSaving(true)

    const htmlSource = framework === 'html' ? htmlCode.trim() : ''
    const cssSource = framework === 'html' ? cssCode.trim() : ''
    const code = framework === 'react' ? reactCode.trim() : buildHtmlCompositeSource(htmlSource, cssSource)

    const payload = {
      framework,
      name: name.trim() || summary.suggestedName,
      category,
      subcategory,
      tags: summary.tags,
      dependencies: summary.dependencies,
      code,
      htmlSource: framework === 'html' ? (htmlSource || undefined) : undefined,
      cssSource: framework === 'html' ? (cssSource || undefined) : undefined,
    }

    let relativePath = ''
    try {
      const result = await saveComponent(payload)
      showToast(`Saved to ${result.relativePath}`, 'success')
      relativePath = result.relativePath
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        const data = typeof err.data === 'object' && err.data ? err.data as { errorCode?: string } : {}
        const duplicateCode = data.errorCode === 'DUPLICATE_SLUG' || err.message.toLowerCase().includes('already exists')
        if (duplicateCode) {
          showToast('A component with that name already exists in this subcategory. Rename it and save again.', 'error')
          setSaving(false)
          return
        }
      }

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
    if (onSaved) {
      window.setTimeout(onSaved, 250)
    }
  }

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
          <div style={addStyles.sectionHeader}>Save Complete</div>
          <ValidationBadge result={postprocessResult} />
        </div>
        <ValidationPanel result={postprocessResult} onCopyErrors={handleCopyErrors} />
        <div style={{ fontSize: 12, opacity: 0.4, textAlign: 'center' as const }}>
          Reloading gallery...
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
      <FormField label="Name (optional)" value={name} onChange={setName} placeholder={analysis?.suggestedName || 'Auto-detected if left blank'} />

      <div style={addStyles.row}>
        <SelectField
          label="Category"
          value={category}
          onChange={handleCategoryChange}
          options={CATEGORY_ORDER.map((value) => ({ value, label: formatTaxonomyLabel(value) }))}
          placeholder="Choose a category"
        />
        <SelectField
          label="Subcategory"
          value={subcategory}
          onChange={setSubcategory}
          options={subcategoryOptions.map((value) => ({ value, label: formatTaxonomyLabel(value) }))}
          placeholder={category ? 'Choose a subcategory' : 'Pick a category first'}
          disabled={!category}
        />
      </div>

      <div style={addStyles.selectionHint}>
        Choose exactly where this component should live in the library. No auto-placement.
      </div>

      <SelectField
        label="Framework"
        value={framework}
        onChange={(value) => setFramework(value as 'react' | 'html')}
        options={[
          { value: 'react', label: 'React' },
          { value: 'html', label: 'HTML + CSS' },
        ]}
        placeholder="Choose a framework"
      />

      {framework === 'react' ? (
        <CodeField
          label="React Code"
          value={reactCode}
          onChange={setReactCode}
          placeholder="Paste your React component code here..."
          minHeight={220}
        />
      ) : (
        <>
          <CodeField
            label="HTML"
            value={htmlCode}
            onChange={setHtmlCode}
            placeholder="Paste your HTML markup here..."
            minHeight={180}
          />
          <CodeField
            label="CSS"
            value={cssCode}
            onChange={setCssCode}
            placeholder="Paste your CSS here..."
            minHeight={160}
          />
        </>
      )}

      <div style={addStyles.summaryCard}>
        <div style={addStyles.sectionHeader}>Save Summary</div>
        <SummaryRow label="Framework" value={framework === 'react' ? 'React' : 'HTML + CSS'} />
        <SummaryRow
          label="Location"
          value={category && subcategory ? `${formatTaxonomyLabel(category)} / ${formatTaxonomyLabel(subcategory)}` : 'Choose a category and subcategory'}
        />
        <SummaryRow label="Saved name" value={name.trim() || analysis?.suggestedName || 'Waiting for code'} />
        <div style={addStyles.resultRow}>
          <span style={addStyles.resultLabel}>Dependencies</span>
          <TagList
            items={analysis?.dependencies || []}
            emptyLabel="none"
            styleOverride={{ background: 'rgba(100,200,255,0.12)', color: 'rgba(150,220,255,0.8)' }}
          />
        </div>
        <div style={addStyles.resultRow}>
          <span style={addStyles.resultLabel}>Tags</span>
          <TagList items={analysis?.tags || []} emptyLabel="none detected" />
        </div>
      </div>

      <button
        style={s.submitBtn}
        onClick={handleConfirm}
        disabled={saving || !canSave}
      >
        {saving ? 'Saving...' : 'Save Component'}
      </button>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={addStyles.resultRow}>
      <span style={addStyles.resultLabel}>{label}</span>
      <span style={addStyles.resultValue}>{value}</span>
    </div>
  )
}

function TagList({
  items,
  emptyLabel,
  styleOverride,
}: {
  items: string[]
  emptyLabel: string
  styleOverride?: React.CSSProperties
}) {
  if (items.length === 0) {
    return <span style={{ fontSize: 12, opacity: 0.3 }}>{emptyLabel}</span>
  }

  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const, justifyContent: 'flex-end' as const }}>
      {items.map((item) => (
        <span key={item} style={{ ...addStyles.resultTag, ...styleOverride }}>{item}</span>
      ))}
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

function CodeField({
  label,
  value,
  onChange,
  placeholder,
  minHeight,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  minHeight: number
}) {
  return (
    <div>
      <div style={s.formLabel}>{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...s.formInput, minHeight, resize: 'vertical' as const, fontFamily: 'monospace', fontSize: 12 }}
      />
    </div>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder: string
  disabled?: boolean
}) {
  return (
    <div style={{ flex: 1 }}>
      <div style={s.formLabel}>{label}</div>
      <div style={addStyles.selectWrap}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={addStyles.selectInput}
          disabled={disabled}
        >
          <option value="" style={addStyles.selectOption}>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value} style={addStyles.selectOption}>
              {option.label}
            </option>
          ))}
        </select>
        <span style={addStyles.selectChevron}>▾</span>
      </div>
    </div>
  )
}

const addStyles: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex',
    gap: 12,
  },
  selectionHint: {
    fontSize: 12,
    color: 'var(--text-muted)',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--brand-text)',
    letterSpacing: '0.02em',
  },
  summaryCard: {
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
    gap: 12,
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
    textAlign: 'right' as const,
  },
  resultTag: {
    fontSize: 10,
    padding: '2px 8px',
    borderRadius: 4,
    background: 'var(--brand-bg)',
    color: 'var(--brand-text)',
  },
  selectWrap: {
    position: 'relative' as const,
  },
  selectInput: {
    ...s.formInput,
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
    MozAppearance: 'none' as const,
    paddingRight: 34,
    colorScheme: 'dark' as const,
  },
  selectOption: {
    background: '#151821',
    color: '#f5f7fb',
  },
  selectChevron: {
    position: 'absolute' as const,
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-muted)',
    pointerEvents: 'none' as const,
    fontSize: 12,
  },
}

function buildHtmlCompositeSource(htmlSource: string, cssSource: string): string {
  const html = htmlSource.trim()
  const css = cssSource.trim()
  if (!html && !css) return ''
  if (!css) return html
  if (!html) return `<style>\n${css}\n</style>`
  return `${html}\n\n<style>\n${css}\n</style>`
}
