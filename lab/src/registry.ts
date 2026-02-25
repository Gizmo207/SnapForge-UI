import React from 'react';

export interface RegistryItem {
  path: string;
  componentDir: string;
  component: React.ComponentType<Record<string, unknown>> | undefined;
  source?: string;
  htmlSource?: string;
  cssSource?: string;
  meta: {
    name: string;
    category: string;
    subcategory: string;
    type: string;
    tags: string[];
    dependencies: string[];
  } | undefined;
}

const modules = import.meta.glob(
  [
    '../../primitives/**/react.tsx',
    '../../components/**/react.tsx',
    '../../patterns/**/react.tsx',
    '../../layouts/**/react.tsx',
    '../../pages/**/react.tsx',
    '../../foundations/**/react.tsx'
  ],
  { eager: true }
)

const sourceModules = import.meta.glob(
  [
    '../../primitives/**/react.tsx',
    '../../components/**/react.tsx',
    '../../patterns/**/react.tsx',
    '../../layouts/**/react.tsx',
    '../../pages/**/react.tsx',
    '../../foundations/**/react.tsx'
  ],
  { eager: true, query: '?raw', import: 'default' }
)

const htmlModules = import.meta.glob(
  [
    '../../primitives/**/html.html',
    '../../components/**/html.html',
    '../../patterns/**/html.html',
    '../../layouts/**/html.html',
    '../../pages/**/html.html',
    '../../foundations/**/html.html'
  ],
  { eager: true, query: '?raw', import: 'default' }
)

const cssModules = import.meta.glob(
  [
    '../../primitives/**/styles.css',
    '../../components/**/styles.css',
    '../../patterns/**/styles.css',
    '../../layouts/**/styles.css',
    '../../pages/**/styles.css',
    '../../foundations/**/styles.css'
  ],
  { eager: true, query: '?raw', import: 'default' }
)

export const registry = Object.entries(modules)
  .map(([path, mod]) => {
    const module = mod as {
      default?: React.ComponentType<Record<string, unknown>>
      meta?: {
        name: string;
        category: string;
        subcategory: string;
        type: string;
        tags: string[];
        dependencies: string[];
      }
    }
    const componentDir = path.replace(/\/react\.tsx$/, '')
    const source = sourceModules[path] as string | undefined
    const htmlSource = htmlModules[`${componentDir}/html.html`] as string | undefined
    const cssSource = cssModules[`${componentDir}/styles.css`] as string | undefined

    return {
      path,
      componentDir,
      component: module.default,
      source,
      htmlSource,
      cssSource,
      meta: module.meta
    }
  })
  .filter(item => typeof item.component === 'function')
