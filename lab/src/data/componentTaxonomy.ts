export const CATEGORY_ORDER = ['foundations', 'primitives', 'components', 'patterns', 'layouts', 'pages'] as const

export const COMPONENT_TAXONOMY = {
  foundations: ['misc'],
  primitives: ['buttons', 'checkboxes', 'toggles', 'radio-buttons', 'inputs', 'loaders', 'badges', 'tooltips', 'misc'],
  components: ['cards', 'modals', 'dropdowns', 'accordions', 'tabs', 'misc'],
  patterns: ['navbars', 'sidebars', 'heroes', 'forms', 'headers', 'footers', 'backgrounds', 'misc'],
  layouts: ['grids', 'fixed', 'misc'],
  pages: ['misc'],
} as const satisfies Record<string, readonly string[]>

export type ComponentCategory = keyof typeof COMPONENT_TAXONOMY

export function getSubcategoryOptions(category: string | null | undefined): readonly string[] {
  if (!category) return []
  return COMPONENT_TAXONOMY[category as ComponentCategory] ?? []
}

export function formatTaxonomyLabel(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
