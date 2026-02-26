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
  themeMode: 'dark' | 'light'
  onToggleTheme: () => void
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
  themeMode,
  onToggleTheme,
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
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--brand-bg-hover)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--brand-bg)' }}
        >
          + Add
        </button>
        <button
          style={{ ...s.addBtn, background: 'var(--surface-button)', borderColor: 'var(--border-strong)', color: 'var(--text-muted)' }}
          onClick={onToggleTheme}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-button-hover)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-button)' }}
        >
          {themeMode === 'dark' ? 'Light' : 'Dark'}
        </button>
        {exportMode ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              style={{ ...s.addBtn, background: exportSelectedCount > 0 ? 'rgba(100,220,140,0.2)' : 'var(--surface-button)', borderColor: exportSelectedCount > 0 ? 'rgba(100,220,140,0.3)' : 'var(--border-strong)', color: exportSelectedCount > 0 ? '#8fffb0' : 'var(--text-muted)' }}
              onClick={() => { if (exportSelectedCount > 0) onOpenExportModal() }}
            >
              Export ({exportSelectedCount})
            </button>
            <button
              style={{ ...s.addBtn, background: 'var(--surface-button)', borderColor: 'var(--border-strong)', color: 'var(--text-muted)' }}
              onClick={onExitExportMode}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            style={{ ...s.addBtn, background: 'var(--surface-button)', borderColor: 'var(--border-strong)', color: 'var(--text-muted)' }}
            onClick={onEnterExportMode}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-button-hover)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-button)' }}
          >
            Export
          </button>
        )}
      </div>
    </div>
  )
}
