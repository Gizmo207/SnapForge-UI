import { s } from './styles'

type HeaderBarProps = {
  filteredCount: number
  search: string
  onSearchChange: (value: string) => void
  onOpenAddModal: () => void
  exportMode: boolean
  exportSelectedCount: number
  onOpenExportModal: () => void
  onExitExportMode: () => void
  onEnterExportMode: () => void
}

export function HeaderBar({
  filteredCount,
  search,
  onSearchChange,
  onOpenAddModal,
  exportMode,
  exportSelectedCount,
  onOpenExportModal,
  onExitExportMode,
  onEnterExportMode,
}: HeaderBarProps) {
  return (
    <div style={s.header}>
      <div style={s.logo}>UI Lab</div>
      <div style={s.searchWrap}>
        <input
          placeholder="Search components..."
          style={s.searchInput}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={s.count}>
          {filteredCount} component{filteredCount !== 1 ? 's' : ''}
        </div>
        <button
          style={s.addBtn}
          onClick={onOpenAddModal}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(140,130,255,0.25)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(140,130,255,0.15)' }}
        >
          + Add
        </button>
        {exportMode ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              style={{ ...s.addBtn, background: exportSelectedCount > 0 ? 'rgba(100,220,140,0.2)' : 'rgba(255,255,255,0.06)', borderColor: exportSelectedCount > 0 ? 'rgba(100,220,140,0.3)' : 'rgba(255,255,255,0.1)', color: exportSelectedCount > 0 ? '#8fffb0' : 'rgba(255,255,255,0.4)' }}
              onClick={() => { if (exportSelectedCount > 0) onOpenExportModal() }}
            >
              Export ({exportSelectedCount})
            </button>
            <button
              style={{ ...s.addBtn, background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}
              onClick={onExitExportMode}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            style={{ ...s.addBtn, background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
            onClick={onEnterExportMode}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
          >
            Export
          </button>
        )}
      </div>
    </div>
  )
}
