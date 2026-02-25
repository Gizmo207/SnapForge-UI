/**
 * Scans component source code for import statements and extracts
 * third-party package names. Ignores relative imports (./foo, ../bar)
 * and built-in modules.
 */

const IMPORT_REGEX = /import\s+(?:[\w{}\s,*]+)\s+from\s+['"]([^'"]+)['"]/g;
const REQUIRE_REGEX = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

const BUILTIN_MODULES = new Set([
  'react', 'react-dom', 'react/jsx-runtime',
]);

function extractPackageName(specifier: string): string | null {
  if (specifier.startsWith('.') || specifier.startsWith('/')) return null;

  if (BUILTIN_MODULES.has(specifier)) return null;

  // Scoped package: @scope/name/sub → @scope/name
  if (specifier.startsWith('@')) {
    const parts = specifier.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : null;
  }

  // Regular package: name/sub → name
  return specifier.split('/')[0];
}

export function detectDependencies(code: string): string[] {
  const deps = new Set<string>();

  for (const regex of [IMPORT_REGEX, REQUIRE_REGEX]) {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(code)) !== null) {
      const pkg = extractPackageName(match[1]);
      if (pkg) deps.add(pkg);
    }
  }

  return Array.from(deps).sort();
}
