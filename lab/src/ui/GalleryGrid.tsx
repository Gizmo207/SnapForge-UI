import type { RegistryItem } from '../registry'
import { s } from './styles'
import { GalleryCard } from './GalleryCard'

type GalleryGridProps = {
  items: RegistryItem[]
  exportMode: boolean
  exportSelected: Set<number>
  onExportToggle: (index: number) => void
  onOpenPreview: (item: RegistryItem) => void
  onOpenCode: (item: RegistryItem) => void
}

export function GalleryGrid({
  items,
  exportMode,
  exportSelected,
  onExportToggle,
  onOpenPreview,
  onOpenCode,
}: GalleryGridProps) {
  if (items.length === 0) {
    return (
      <div style={s.empty}>
        <p style={{ fontSize: 16, opacity: 0.5 }}>No components found.</p>
        <p style={{ fontSize: 13, opacity: 0.3, marginTop: 8 }}>
          Add a component folder with a react.tsx file exporting meta and a default component.
        </p>
      </div>
    )
  }

  return (
    <div style={s.grid}>
      {items.map((item, i) => (
        <GalleryCard
          key={i}
          item={item}
          exportMode={exportMode}
          exportChecked={exportSelected.has(i)}
          onExportToggle={() => onExportToggle(i)}
          onOpenPreview={() => onOpenPreview(item)}
          onOpenCode={() => onOpenCode(item)}
        />
      ))}
    </div>
  )
}
