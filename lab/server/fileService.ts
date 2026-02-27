import { Pool } from 'pg';
import { sanitize } from '../src/engine/sanitizer/sanitize.js';
import { parseCheck } from '../src/engine/parser/parseCheck.js';
import type { ParseCheckResult } from '../src/engine/parser/types.js';

export type SaveRequest = {
  name: string;
  code: string;
  htmlSource?: string;
  cssSource?: string;
  framework: string;
  category: string;
  subcategory: string;
  tags: string[];
  dependencies: string[];
};

export type SaveResult = {
  success: boolean;
  filePath: string;
  relativePath: string;
  status: 'created' | 'duplicate' | 'error';
  message: string;
  errorCode?: 'DUPLICATE_SLUG' | 'UNKNOWN';
};

type ComponentMeta = {
  name: string;
  category: string;
  subcategory: string;
  type: string;
  tags: string[];
  dependencies: string[];
};

export type ComponentCatalogItem = {
  path: string;
  componentDir: string;
  source?: string;
  htmlSource?: string;
  cssSource?: string;
  meta?: ComponentMeta;
};

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required for component storage');
}

const useSsl = !/localhost|127\.0\.0\.1/i.test(DATABASE_URL);

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});

let initPromise: Promise<void> | null = null;

export async function initStore(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS components (
        id BIGSERIAL PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        subcategory TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'react',
        tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
        dependencies TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
        source TEXT NOT NULL,
        html_source TEXT,
        css_source TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_components_category_subcategory
      ON components (category, subcategory);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_components_created_at
      ON components (created_at DESC);
    `);

    await pool.query(`
      CREATE OR REPLACE FUNCTION set_components_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS trg_components_updated_at ON components;
      CREATE TRIGGER trg_components_updated_at
      BEFORE UPDATE ON components
      FOR EACH ROW
      EXECUTE FUNCTION set_components_updated_at();
    `);
  })();

  return initPromise;
}

function normalizeName(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .toLowerCase()
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function generateMeta(req: SaveRequest): string {
  const tagsStr = req.tags.map((t) => `"${t}"`).join(', ');
  const depsStr = req.dependencies.map((d) => `"${d}"`).join(', ');
  return `export const meta = {
  name: "${req.name}",
  category: "${req.category}",
  subcategory: "${req.subcategory}",
  type: "${req.framework}",
  tags: [${tagsStr}],
  dependencies: [${depsStr}],
};\n\n`;
}

function detectFramework(code: string): 'react' | 'html' {
  const hasReactImport = /import\s+.*from\s+['"]react['"]/.test(code);
  const hasUseState = code.includes('useState(');
  return hasReactImport || hasUseState ? 'react' : 'html';
}

function extractImports(code: string): { imports: string; body: string } {
  const lines = code.split('\n');
  const importLines: string[] = [];
  const bodyLines: string[] = [];
  let pastImports = false;

  for (const line of lines) {
    if (!pastImports && (line.startsWith('import ') || line.trim() === '')) {
      importLines.push(line);
    } else {
      pastImports = true;
      bodyLines.push(line);
    }
  }

  // Remove 'import React' lines (react-jsx handles it)
  const cleanImports = importLines.filter(
    (l) => !l.match(/import\s+React\s/)
  );

  return {
    imports: cleanImports.join('\n').trim(),
    body: bodyLines.join('\n').trim(),
  };
}

function wrapCode(req: SaveRequest): string {
  const meta = generateMeta(req);

  if (req.code.includes('export const meta')) {
    return req.code;
  }

  const { imports, body } = extractImports(req.code);
  const hasDefault = req.code.includes('export default');
  const componentName = req.name.replace(/[^a-zA-Z0-9]/g, '') || 'Component';

  let result = '';
  if (imports) result += imports + '\n\n';
  result += meta;
  result += body;
  if (!hasDefault) result += `\n\nexport default ${componentName};\n`;

  return result;
}

function normalizeArray(values: string[] | undefined): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean);
}

function normalizeSegment(value: string, fallback: string): string {
  const normalized = normalizeName(value);
  return normalized || fallback;
}

function normalizeRelativePath(filePath: string): string {
  return filePath
    .replace(/\\/g, '/')
    .replace(/^(\.\.\/)+/g, '')
    .replace(/^\.?\//, '')
    .replace(/\/+/g, '/');
}

function slugFromFilePath(filePath: string): string {
  const normalized = normalizeRelativePath(filePath);
  if (normalized.endsWith('/react.tsx')) {
    return normalized.slice(0, -'/react.tsx'.length);
  }
  return normalized;
}

type DbComponentRow = {
  slug: string;
  name: string;
  category: string;
  subcategory: string;
  type: string;
  tags: string[];
  dependencies: string[];
  source: string;
  html_source: string | null;
  css_source: string | null;
};

function mapRowToCatalogItem(row: DbComponentRow): ComponentCatalogItem {
  return {
    path: `${row.slug}/react.tsx`,
    componentDir: row.slug,
    source: row.source,
    htmlSource: row.html_source ?? undefined,
    cssSource: row.css_source ?? undefined,
    meta: {
      name: row.name,
      category: row.category,
      subcategory: row.subcategory,
      type: row.type,
      tags: row.tags ?? [],
      dependencies: row.dependencies ?? [],
    },
  };
}

export async function deleteComponent(filePath: string): Promise<{ success: boolean; message: string }> {
  await initStore();

  const slug = slugFromFilePath(filePath);
  if (!slug || slug.includes('..')) {
    return { success: false, message: 'Invalid path' };
  }

  try {
    const result = await pool.query<{ slug: string }>(
      'DELETE FROM components WHERE slug = $1 RETURNING slug',
      [slug],
    );

    if (result.rowCount === 0) {
      return { success: false, message: `File not found: ${filePath}` };
    }

    return { success: true, message: `Deleted ${normalizeRelativePath(filePath)}` };
  } catch (err: unknown) {
    return { success: false, message: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function saveComponent(req: SaveRequest): Promise<SaveResult> {
  await initStore();

  const detectedFramework = detectFramework(req.code);
  const category = normalizeSegment(req.category, 'components');
  const subcategory = normalizeSegment(req.subcategory, 'misc');
  const name = req.name.trim() || 'Component';
  const fileName = normalizeName(name) || 'component';
  const componentDir = `${category}/${subcategory}/${fileName}`;
  const relativePath = `${componentDir}/react.tsx`;
  const filePath = relativePath;

  try {
    const finalCode = wrapCode({
      ...req,
      name,
      category,
      subcategory,
      framework: detectedFramework,
      tags: normalizeArray(req.tags),
      dependencies: normalizeArray(req.dependencies),
    });

    const result = await pool.query<{ slug: string }>(
      `
      INSERT INTO components (
        slug, name, category, subcategory, type,
        tags, dependencies, source, html_source, css_source
      )
      VALUES ($1, $2, $3, $4, $5, $6::text[], $7::text[], $8, $9, $10)
      ON CONFLICT (slug) DO NOTHING
      RETURNING slug
      `,
      [
        componentDir,
        name,
        category,
        subcategory,
        detectedFramework,
        normalizeArray(req.tags),
        normalizeArray(req.dependencies),
        finalCode,
        detectedFramework === 'html' && req.htmlSource?.trim() ? req.htmlSource : null,
        detectedFramework === 'html' && req.cssSource?.trim() ? req.cssSource : null,
      ],
    );

    if (result.rowCount === 0) {
      return {
        success: false,
        filePath,
        relativePath,
        status: 'duplicate',
        message: `A component with this slug already exists (${componentDir}). Rename it and try again.`,
        errorCode: 'DUPLICATE_SLUG',
      };
    }

    return {
      success: true,
      filePath,
      relativePath,
      status: 'created',
      message: `Saved to ${relativePath}`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      filePath,
      relativePath,
      status: 'error',
      message: err instanceof Error ? err.message : 'Unknown error',
      errorCode: 'UNKNOWN',
    };
  }
}

export async function listComponents(): Promise<ComponentCatalogItem[]> {
  await initStore();

  const result = await pool.query<DbComponentRow>(`
    SELECT
      slug, name, category, subcategory, type,
      tags, dependencies, source, html_source, css_source
    FROM components
    ORDER BY created_at DESC, id DESC
  `);

  return result.rows.map(mapRowToCatalogItem);
}

type ComponentSourceRecord = {
  id: number;
  source: string;
};

async function getComponentSource(filePath: string): Promise<ComponentSourceRecord | null> {
  await initStore();

  const slug = slugFromFilePath(filePath);
  if (!slug || slug.includes('..')) return null;

  const result = await pool.query<ComponentSourceRecord>(
    'SELECT id, source FROM components WHERE slug = $1',
    [slug],
  );

  return result.rows[0] ?? null;
}

export type PostprocessServiceResult = {
  found: boolean;
  sanitized: boolean;
  appliedRules: string[];
  parseResult: ParseCheckResult;
};

export async function postprocessComponent(filePath: string): Promise<PostprocessServiceResult> {
  const record = await getComponentSource(filePath);
  if (!record) {
    return {
      found: false,
      sanitized: false,
      appliedRules: [],
      parseResult: {
        parseOk: false,
        parseErrors: [{ message: `File not found: ${filePath}`, line: null, column: null }],
      },
    };
  }

  const sanitizeResult = sanitize(record.source);
  const sourceToParse = sanitizeResult.source;

  if (sanitizeResult.sanitized) {
    await pool.query(
      'UPDATE components SET source = $1 WHERE id = $2',
      [sourceToParse, record.id],
    );
  }

  return {
    found: true,
    sanitized: sanitizeResult.sanitized,
    appliedRules: sanitizeResult.appliedRules,
    parseResult: parseCheck(sourceToParse),
  };
}
