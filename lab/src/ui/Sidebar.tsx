import { s } from './styles'

type SidebarProps = {
  structure: Record<string, string[]>
  registryLength: number
  selectedCategory: string | null
  selectedSub: string | null
  selectedTag: string | null
  expanded: Record<string, boolean>
  allTags: string[]
  countFor: (cat: string, sub?: string) => number
  onToggleExpand: (cat: string) => void
  onSelectAll: () => void
  onSelectCategory: (cat: string) => void
  onSelectSub: (cat: string, sub: string) => void
  onToggleTag: (tag: string) => void
}

export function Sidebar({
  structure,
  registryLength,
  selectedCategory,
  selectedSub,
  selectedTag,
  expanded,
  allTags,
  countFor,
  onToggleExpand,
  onSelectAll,
  onSelectCategory,
  onSelectSub,
  onToggleTag,
}: SidebarProps) {
  return (
    <div style={s.sidebar}>
      <div style={s.sidebarSection}>Categories</div>

      <SidebarRow
        label="All"
        count={registryLength}
        active={selectedCategory === null && selectedSub === null && selectedTag === null}
        onClick={onSelectAll}
      />

      {Object.entries(structure).map(([cat, subs]) => (
        <div key={cat}>
          <div
            style={{
              ...s.catRow,
              background: selectedCategory === cat && !selectedSub ? 'rgba(255,255,255,0.06)' : 'transparent',
              color: selectedCategory === cat && !selectedSub ? '#fff' : 'rgba(255,255,255,0.5)',
            }}
            onMouseEnter={(e) => {
              if (!(selectedCategory === cat && !selectedSub)) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
            }}
            onMouseLeave={(e) => {
              if (!(selectedCategory === cat && !selectedSub)) e.currentTarget.style.background = 'transparent'
            }}
          >
            <div
              style={s.chevron}
              onClick={(e) => { e.stopPropagation(); onToggleExpand(cat) }}
            >
              {expanded[cat] ? '▾' : '▸'}
            </div>
            <div
              style={{ flex: 1, cursor: 'pointer', textTransform: 'capitalize' as const }}
              onClick={() => onSelectCategory(cat)}
            >
              {cat}
            </div>
            <span style={s.badge}>{countFor(cat)}</span>
          </div>

          {expanded[cat] && subs.map((sub) => (
            <SidebarRow
              key={sub}
              label={sub}
              count={countFor(cat, sub)}
              active={selectedCategory === cat && selectedSub === sub}
              indent
              onClick={() => onSelectSub(cat, sub)}
            />
          ))}
        </div>
      ))}

      <div style={{ ...s.sidebarSection, marginTop: 20 }}>Tags</div>
      <div style={s.tagCloud}>
        {allTags.map((tag) => (
          <span
            key={tag}
            style={{
              ...s.tagPill,
              background: selectedTag === tag ? 'rgba(140,130,255,0.2)' : 'rgba(255,255,255,0.04)',
              borderColor: selectedTag === tag ? 'rgba(140,130,255,0.4)' : 'rgba(255,255,255,0.08)',
              color: selectedTag === tag ? '#c4bfff' : 'rgba(255,255,255,0.45)',
            }}
            onClick={() => onToggleTag(tag)}
            onMouseEnter={(e) => {
              if (selectedTag !== tag) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
            }}
            onMouseLeave={(e) => {
              if (selectedTag !== tag) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}

function SidebarRow({ label, count, active, indent, onClick }: {
  label: string
  count: number
  active: boolean
  indent?: boolean
  onClick: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: indent ? '5px 10px 5px 32px' : '7px 10px',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: indent ? 12 : 13,
        fontWeight: 500,
        marginBottom: 2,
        transition: 'all 0.15s ease',
        background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
        color: active ? '#fff' : indent ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.5)',
        borderLeft: active ? '2px solid rgba(140,130,255,0.7)' : '2px solid transparent',
        textTransform: 'capitalize' as const,
      }}
      onClick={onClick}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      <span>{label}</span>
      <span style={s.badge}>{count}</span>
    </div>
  )
}
