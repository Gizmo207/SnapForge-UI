/**
 * Dependency Graph Engine
 * 
 * Takes a set of selected components, merges their dependency arrays,
 * deduplicates, and generates a clean dependency manifest with versions.
 */

import type { RegistryItem } from '../registry';

// Known package versions — curated map of common UI packages
const VERSION_MAP: Record<string, string> = {
  // Styling
  'styled-components': '^6.1.0',
  'tailwindcss': '^3.4.0',
  '@emotion/react': '^11.11.0',
  '@emotion/styled': '^11.11.0',
  'sass': '^1.70.0',
  'clsx': '^2.1.0',
  'class-variance-authority': '^0.7.0',
  'tailwind-merge': '^2.2.0',

  // Animation
  'framer-motion': '^11.0.0',
  'gsap': '^3.12.0',
  '@react-spring/web': '^9.7.0',
  'animejs': '^3.2.0',
  'lottie-react': '^2.4.0',

  // Icons
  'lucide-react': '^0.300.0',
  'react-icons': '^5.0.0',
  '@heroicons/react': '^2.1.0',
  '@phosphor-icons/react': '^2.0.0',

  // UI Libraries
  '@radix-ui/react-dialog': '^1.0.0',
  '@radix-ui/react-dropdown-menu': '^2.0.0',
  '@radix-ui/react-tooltip': '^1.0.0',
  '@radix-ui/react-popover': '^1.0.0',
  '@radix-ui/react-select': '^2.0.0',
  '@radix-ui/react-slot': '^1.0.0',
  '@headlessui/react': '^2.0.0',

  // Utilities
  'date-fns': '^3.0.0',
  'zod': '^3.22.0',
  'zustand': '^4.5.0',
  'jotai': '^2.6.0',
  'react-hook-form': '^7.50.0',
  '@tanstack/react-query': '^5.17.0',
  'axios': '^1.6.0',
  'swr': '^2.2.0',

  // Charts / Data
  'recharts': '^2.10.0',
  'd3': '^7.8.0',
  'chart.js': '^4.4.0',
  'react-chartjs-2': '^5.2.0',

  // 3D / Canvas
  'three': '^0.160.0',
  '@react-three/fiber': '^8.15.0',
  '@react-three/drei': '^9.92.0',

  // Misc
  'react-hot-toast': '^2.4.0',
  'sonner': '^1.3.0',
  'cmdk': '^0.2.0',
  'vaul': '^0.9.0',
  'embla-carousel-react': '^8.0.0',
};

export type DependencyManifest = {
  dependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  summary: {
    totalPackages: number;
    components: string[];
  };
};

/**
 * Resolves a version for a package name.
 * Uses the curated VERSION_MAP, falls back to "latest".
 */
function resolveVersion(pkg: string): string {
  return VERSION_MAP[pkg] ?? 'latest';
}

/**
 * Merges dependencies from a set of selected registry items
 * into a single deduplicated manifest with resolved versions.
 */
export function buildDependencyManifest(items: RegistryItem[]): DependencyManifest {
  const allDeps = new Set<string>();
  const componentNames: string[] = [];

  for (const item of items) {
    componentNames.push(item.meta?.name ?? item.componentDir.split('/').pop() ?? 'unknown-component');
    if (item.meta?.dependencies) {
      for (const dep of item.meta.dependencies) {
        allDeps.add(dep);
      }
    }
  }

  const dependencies: Record<string, string> = {};
  for (const dep of Array.from(allDeps).sort()) {
    dependencies[dep] = resolveVersion(dep);
  }

  // React is always a peer dependency, never a direct dep
  const peerDependencies: Record<string, string> = {
    'react': '^18.2.0',
    'react-dom': '^18.2.0',
  };

  return {
    dependencies,
    peerDependencies,
    summary: {
      totalPackages: Object.keys(dependencies).length,
      components: componentNames,
    },
  };
}

/**
 * Generates a package.json-ready dependencies block as a formatted string.
 */
export function formatManifestJSON(manifest: DependencyManifest): string {
  const pkg = {
    dependencies: {
      ...manifest.peerDependencies,
      ...manifest.dependencies,
    },
  };
  return JSON.stringify(pkg, null, 2);
}
