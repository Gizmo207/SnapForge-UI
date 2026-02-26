import { useEffect, useState } from 'react'
import type React from 'react'
import type { RegistryItem } from './registry'
import { buildDependencyManifest, formatManifestJSON } from './engine/dependencyGraph'
import { HeaderBar } from './ui/HeaderBar'
import { Sidebar } from './ui/Sidebar'
import { GalleryGrid } from './ui/GalleryGrid'
import { DetailModal } from './ui/modals/DetailModal'
import { AddComponentModal } from './ui/modals/AddComponentModal'
import { ExportModal } from './ui/modals/ExportModal'
import { Toast } from './ui/Toast'
import { s } from './ui/styles'
import { copyToClipboard } from './services/clipboardService'
import { confirmDialog } from './services/dialogService'
import { deleteComponent, exportZip, fetchComponents } from './services/fileServiceClient'
import {
  buildHtmlExportBundle,
  buildReactExportBundle,
  type ExportFramework,
} from './pure/exportBundles'

const CATEGORY_ORDER = ['foundations', 'primitives', 'components', 'patterns', 'layouts', 'pages']
const MAX_VISIBLE_TAGS = 12

function App() {
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedSub, setSelectedSub] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [selected, setSelected] = useState<RegistryItem | null>(null)
  const [showCode, setShowCode] = useState(false)
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [exportMode, setExportMode] = useState(false)
  const [exportSelected, setExportSelected] = useState<Set<number>>(new Set())
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportFramework, setExportFramework] = useState<ExportFramework>('react')
  const [exportDownloading, setExportDownloading] = useState(false)
  const [registryItems, setRegistryItems] = useState<RegistryItem[]>([])

  const loadComponents = async () => {
    try {
      const items = await fetchComponents()
      setRegistryItems(items)
    } catch (err: unknown) {
      setToast({ message: err instanceof Error ? err.message : 'Failed to load components', type: 'error' })
    }
  }

  useEffect(() => {
    void loadComponents()
  }, [])

  const themeVars: React.CSSProperties = themeMode === 'dark'
    ? {
        '--surface-app': 'radial-gradient(circle at top left, #1a1a2e, #0f0f0f 60%)',
        '--surface-header': 'rgba(15,15,15,0.7)',
        '--surface-sidebar': 'rgba(15,15,15,0.5)',
        '--surface-card': 'rgba(255,255,255,0.03)',
        '--surface-preview': 'rgba(0,0,0,0.3)',
        '--surface-overlay': 'rgba(0,0,0,0.7)',
        '--surface-modal': 'rgba(18,18,22,0.97)',
        '--surface-code': 'rgba(0,0,0,0.4)',
        '--surface-input': 'rgba(255,255,255,0.04)',
        '--surface-button': 'rgba(255,255,255,0.04)',
        '--surface-button-hover': 'rgba(255,255,255,0.08)',
        '--surface-pill': 'rgba(255,255,255,0.05)',
        '--text-primary': '#ffffff',
        '--text-secondary': 'rgba(255,255,255,0.7)',
        '--text-muted': 'rgba(255,255,255,0.5)',
        '--text-subtle': 'rgba(255,255,255,0.25)',
        '--border-subtle': 'rgba(255,255,255,0.06)',
        '--border-strong': 'rgba(255,255,255,0.1)',
        '--brand-bg': 'rgba(140,130,255,0.15)',
        '--brand-bg-hover': 'rgba(140,130,255,0.25)',
        '--brand-border': 'rgba(140,130,255,0.3)',
        '--brand-text': '#c4bfff',
      } as React.CSSProperties
    : {
        '--surface-app': 'radial-gradient(circle at top left, #eef3ff, #f8fbff 60%)',
        '--surface-header': 'rgba(255,255,255,0.88)',
        '--surface-sidebar': 'rgba(255,255,255,0.78)',
        '--surface-card': 'rgba(255,255,255,0.86)',
        '--surface-preview': 'rgba(15,23,42,0.05)',
        '--surface-overlay': 'rgba(15,23,42,0.35)',
        '--surface-modal': 'rgba(255,255,255,0.98)',
        '--surface-code': 'rgba(15,23,42,0.06)',
        '--surface-input': 'rgba(15,23,42,0.04)',
        '--surface-button': 'rgba(15,23,42,0.06)',
        '--surface-button-hover': 'rgba(15,23,42,0.1)',
        '--surface-pill': 'rgba(15,23,42,0.08)',
        '--text-primary': '#0f172a',
        '--text-secondary': 'rgba(15,23,42,0.78)',
        '--text-muted': 'rgba(15,23,42,0.62)',
        '--text-subtle': 'rgba(15,23,42,0.45)',
        '--border-subtle': 'rgba(15,23,42,0.12)',
        '--border-strong': 'rgba(15,23,42,0.2)',
        '--brand-bg': 'rgba(79,70,229,0.14)',
        '--brand-bg-hover': 'rgba(79,70,229,0.2)',
        '--brand-border': 'rgba(79,70,229,0.3)',
        '--brand-text': '#4338ca',
      } as React.CSSProperties

  const structure = CATEGORY_ORDER.reduce<Record<string, string[]>>((acc, cat) => {
    const subs = new Set<string>()
    registryItems.forEach((item) => {
      if (item.meta?.category === cat && item.meta?.subcategory) subs.add(item.meta.subcategory)
    })
    if (subs.size > 0) acc[cat] = Array.from(subs).sort()
    return acc
  }, {})

  const tagCounts = registryItems.reduce<Record<string, number>>((acc, item) => {
    for (const tag of item.meta?.tags || []) {
      acc[tag] = (acc[tag] || 0) + 1
    }
    return acc
  }, {})

  const allTags = Object.entries(tagCounts)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1]
      return a[0].localeCompare(b[0])
    })
    .slice(0, MAX_VISIBLE_TAGS)
    .map(([tag]) => tag)

  const countFor = (cat: string, sub?: string) =>
    registryItems.filter((item) => item.meta?.category === cat && (sub ? item.meta?.subcategory === sub : true)).length

  const filtered = registryItems.filter((item) => {
    const matchCat = selectedCategory ? item.meta?.category === selectedCategory : true
    const matchSub = selectedSub ? item.meta?.subcategory === selectedSub : true
    const matchTag = selectedTag ? item.meta?.tags?.includes(selectedTag) : true
    const matchSearch = search
      ? item.meta?.name.toLowerCase().includes(search.toLowerCase()) ||
        item.meta?.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()))
      : true
    return matchCat && matchSub && matchTag && matchSearch
  })

  const toggleExpand = (cat: string) => setExpanded((prev) => ({ ...prev, [cat]: !prev[cat] }))

  const handleCopy = async (text: string) => {
    try {
      await copyToClipboard(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err: unknown) {
      setToast({ message: err instanceof Error ? err.message : 'Copy failed', type: 'error' })
    }
  }

  const handleDelete = async (item: RegistryItem) => {
    if (!confirmDialog(`Delete "${item.meta?.name}"?\n\nThis will permanently remove the file from disk.`)) return
    const cleanedPath = item.path.replace(/^(\.\.\/)+/, '')

    try {
      const result = await deleteComponent(cleanedPath)
      setToast({ message: result.message, type: 'success' })
      setSelected(null)
      await loadComponents()
    } catch (err: unknown) {
      setToast({ message: err instanceof Error ? err.message : 'Delete failed', type: 'error' })
    }
  }

  const selectedItems = filtered.filter((_, i) => exportSelected.has(i))
  const manifest = buildDependencyManifest(selectedItems)
  const manifestJSON = formatManifestJSON(manifest)
  const reactBundle = buildReactExportBundle(selectedItems)
  const htmlBundle = buildHtmlExportBundle(selectedItems)

  const handleDownloadZip = async () => {
    if (selectedItems.length === 0 || exportDownloading) return
    setExportDownloading(true)

    try {
      const payload = selectedItems.map((item) => ({
        componentDir: item.componentDir,
        source: item.source,
        htmlSource: item.htmlSource,
        cssSource: item.cssSource,
        meta: {
          name: item.meta?.name,
          dependencies: item.meta?.dependencies ?? [],
        },
      }))

      const blob = await exportZip(payload, exportFramework)
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'ui-lab-bundle.zip'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(url)
      setToast({ message: 'ZIP export downloaded', type: 'success' })
    } catch (err: unknown) {
      setToast({ message: err instanceof Error ? err.message : 'ZIP export failed', type: 'error' })
    } finally {
      setExportDownloading(false)
    }
  }

  return (
    <div style={{ ...s.app, ...themeVars, colorScheme: themeMode }}>
      <HeaderBar
        filteredCount={filtered.length}
        search={search}
        onSearchChange={setSearch}
        onOpenAddModal={() => setShowAddModal(true)}
        exportMode={exportMode}
        exportSelectedCount={exportSelected.size}
        onOpenExportModal={() => {
          setExportFramework('react')
          setCopied(false)
          setShowExportModal(true)
        }}
        onExitExportMode={() => {
          setExportMode(false)
          setExportSelected(new Set())
        }}
        onEnterExportMode={() => setExportMode(true)}
        themeMode={themeMode}
        onToggleTheme={() => setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'))}
      />

      <div
        style={{
          padding: '14px 20px 10px',
          textAlign: 'center',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--surface-input)',
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>
          Build once. Reuse everywhere.
        </div>
        <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
          SnapForge UI is a searchable library of reusable UI components you can preview, copy, and export into any project.
        </div>
      </div>

      <div style={s.body}>
        <Sidebar
          structure={structure}
          registryLength={registryItems.length}
          selectedCategory={selectedCategory}
          selectedSub={selectedSub}
          selectedTag={selectedTag}
          expanded={expanded}
          allTags={allTags}
          countFor={countFor}
          onToggleExpand={toggleExpand}
          onSelectAll={() => {
            setSelectedCategory(null)
            setSelectedSub(null)
            setSelectedTag(null)
          }}
          onSelectCategory={(cat) => {
            setSelectedCategory(cat)
            setSelectedSub(null)
            setSelectedTag(null)
            setExpanded((prev) => ({ ...prev, [cat]: true }))
          }}
          onSelectSub={(cat, sub) => {
            setSelectedCategory(cat)
            setSelectedSub(sub)
            setSelectedTag(null)
          }}
          onToggleTag={(tag) => {
            setSelectedTag(selectedTag === tag ? null : tag)
            setSelectedCategory(null)
            setSelectedSub(null)
          }}
        />

        <div style={s.main}>
          <GalleryGrid
            items={filtered}
            exportMode={exportMode}
            exportSelected={exportSelected}
            onExportToggle={(i) => {
              setExportSelected((prev) => {
                const next = new Set(prev)
                if (next.has(i)) next.delete(i)
                else next.add(i)
                return next
              })
            }}
            onOpenPreview={(item) => {
              setSelected(item)
              setShowCode(false)
              setCopied(false)
            }}
            onOpenCode={(item) => {
              setSelected(item)
              setShowCode(true)
              setCopied(false)
            }}
          />
        </div>
      </div>

      {selected && (
        <DetailModal
          item={selected}
          showCode={showCode}
          copied={copied}
          onClose={() => setSelected(null)}
          onShowPreview={() => setShowCode(false)}
          onShowCode={() => setShowCode(true)}
          onCopyCode={() => selected.source && handleCopy(selected.source)}
          onDelete={() => handleDelete(selected)}
        />
      )}

      {showAddModal && (
        <AddComponentModal
          onClose={() => setShowAddModal(false)}
          showToast={(msg, type) => setToast({ message: msg, type })}
          onSaved={() => {
            void loadComponents()
          }}
        />
      )}

      {showExportModal && (
        <ExportModal
          selectedItems={selectedItems}
          manifest={manifest}
          manifestJSON={manifestJSON}
          reactBundle={reactBundle}
          htmlBundle={htmlBundle}
          exportFramework={exportFramework}
          onClose={() => setShowExportModal(false)}
          onSetExportFramework={setExportFramework}
          onDownloadZip={handleDownloadZip}
          downloadInProgress={exportDownloading}
          onDone={() => {
            setShowExportModal(false)
            setExportMode(false)
            setExportSelected(new Set())
          }}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  )
}

export default App

