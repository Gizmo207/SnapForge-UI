import { createElement, useState } from 'react'
import type { RegistryItem } from '../registry'
import { s } from './styles'

type GalleryCardProps = {
  item: RegistryItem
  exportMode?: boolean
  exportChecked?: boolean
  onExportToggle?: () => void
  onOpenPreview: () => void
  onOpenCode: () => void
}

export function GalleryCard({ item, exportMode, exportChecked, onExportToggle, onOpenPreview, onOpenCode }: GalleryCardProps) {
  const [hovered, setHovered] = useState(false)
  const Component = item.component

  return (
    <div
      style={{
        ...s.card,
        borderColor: exportChecked ? 'rgba(100,220,140,0.4)' : hovered ? 'var(--border-strong)' : 'var(--border-subtle)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: exportChecked ? '0 0 20px rgba(100,220,140,0.1)' : hovered ? '0 12px 32px rgba(0,0,0,0.4)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={exportMode ? onExportToggle : undefined}
    >
      {exportMode && (
        <div style={{
          position: 'absolute' as const, top: 10, left: 10, zIndex: 3,
          width: 20, height: 20, borderRadius: 6,
          border: exportChecked ? '2px solid rgba(100,220,140,0.8)' : '2px solid var(--border-strong)',
          background: exportChecked ? 'rgba(100,220,140,0.3)' : 'var(--surface-code)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, color: '#8fffb0',
        }}>
          {exportChecked ? '✓' : ''}
        </div>
      )}
      <div style={s.cardPreview}>
        {Component && createElement(Component)}
      </div>
      <div style={s.cardInfo}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={s.cardTitle}>{item.meta?.name}</div>
            <div style={s.itemMeta}>{item.meta?.category} {item.meta?.subcategory && `/ ${item.meta.subcategory}`}</div>
          </div>
          {hovered && !exportMode && (
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button
                style={s.cardBtn}
                onClick={onOpenPreview}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(140,130,255,0.2)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-button)' }}
              >
                Preview
              </button>
              <button
                style={s.cardBtn}
                onClick={onOpenCode}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(140,130,255,0.2)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-button)' }}
              >
                Code
              </button>
            </div>
          )}
        </div>
        {item.meta?.tags && (
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
            {item.meta.tags.slice(0, 3).map((t) => (
              <span key={t} style={s.cardTag}>{t}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
