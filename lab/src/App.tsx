import { useState } from 'react'
import { registry, type RegistryItem } from './registry'
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
import { deleteComponent, exportZip } from './services/fileServiceClient'
import {
  buildHtmlExportBundle,
  buildReactExportBundle,
  type ExportFramework,
} from './pure/exportBundles'

const CATEGORY_ORDER = ['foundations', 'primitives', 'components', 'patterns', 'layouts', 'pages']

function App() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedSub, setSelectedSub] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ primitives: true })
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

  const structure = CATEGORY_ORDER.reduce<Record<string, string[]>>((acc, cat) => {
    const subs = new Set<string>()
    registry.forEach((item) => {
      if (item.meta?.category === cat && item.meta?.subcategory) subs.add(item.meta.subcategory)
    })
    if (subs.size > 0) acc[cat] = Array.from(subs).sort()
    return acc
  }, {})

  const allTags = Array.from(new Set(registry.flatMap((item) => item.meta?.tags || []))).sort()

  const countFor = (cat: string, sub?: string) =>
    registry.filter((item) => item.meta?.category === cat && (sub ? item.meta?.subcategory === sub : true)).length

  const filtered = registry.filter((item) => {
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
    <div style={s.app}>
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
      />

      <div style={s.body}>
        <Sidebar
          structure={structure}
          registryLength={registry.length}
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
