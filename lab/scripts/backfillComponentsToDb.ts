import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';

type ComponentMeta = {
  name: string;
  category: string;
  subcategory: string;
  type: string;
  tags: string[];
  dependencies: string[];
};

const CATEGORIES = ['primitives', 'components', 'patterns', 'layouts', 'pages', 'foundations'];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

// Prefer public URL for CLI backfills run outside Railway private network.
const DATABASE_URL = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required to run backfill');
}

const useSsl = !/localhost|127\.0\.0\.1/i.test(DATABASE_URL);

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});

function walkReactEntries(dirPath: string, out: string[]) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkReactEntries(fullPath, out);
      continue;
    }
    if (entry.isFile() && entry.name === 'react.tsx') {
      out.push(fullPath);
    }
  }
}

function readTextIfExists(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf-8');
}

function titleFromSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function parseMetaFromSource(source: string): ComponentMeta | undefined {
  const metaBlockMatch = source.match(/export\s+const\s+meta\s*=\s*\{([\s\S]*?)\}\s*;?/m);
  if (!metaBlockMatch) return undefined;
  const block = metaBlockMatch[1];

  const readString = (field: string): string | undefined => {
    const match = block.match(new RegExp(`${field}\\s*:\\s*["'\`]([^"'\`]+)["'\`]`, 'm'));
    return match?.[1];
  };

  const readArray = (field: string): string[] => {
    const match = block.match(new RegExp(`${field}\\s*:\\s*\\[([\\s\\S]*?)\\]`, 'm'));
    if (!match) return [];
    const items: string[] = [];
    const re = /["'`]([^"'`]+)["'`]/g;
    let entry: RegExpExecArray | null;
    entry = re.exec(match[1]);
    while (entry) {
      items.push(entry[1]);
      entry = re.exec(match[1]);
    }
    return items;
  };

  const name = readString('name');
  const category = readString('category');
  const subcategory = readString('subcategory');
  const type = readString('type') ?? 'react';

  if (!name || !category || !subcategory) return undefined;

  return {
    name,
    category,
    subcategory,
    type,
    tags: readArray('tags'),
    dependencies: readArray('dependencies'),
  };
}

function inferMetaFromPath(relativePath: string): ComponentMeta {
  const parts = relativePath.split('/');
  const category = parts[0] || 'components';
  const subcategory = parts[1] || 'misc';
  const componentSlug = parts[2] || path.basename(path.dirname(relativePath));

  return {
    name: titleFromSlug(componentSlug),
    category,
    subcategory,
    type: 'react',
    tags: [],
    dependencies: [],
  };
}

function normalizeArray(values: string[] | undefined): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean);
}

async function ensureSchema() {
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
}

async function backfill() {
  await ensureSchema();

  const reactEntries: string[] = [];
  for (const category of CATEGORIES) {
    const rootPath = path.join(REPO_ROOT, category);
    if (!fs.existsSync(rootPath)) continue;
    walkReactEntries(rootPath, reactEntries);
  }

  let inserted = 0;
  let updated = 0;
  let failed = 0;

  for (const filePath of reactEntries) {
    const relativePath = path.relative(REPO_ROOT, filePath).replace(/\\/g, '/');
    const componentDir = relativePath.replace(/\/react\.tsx$/, '');
    const source = fs.readFileSync(filePath, 'utf-8');
    const htmlSource = readTextIfExists(path.join(REPO_ROOT, componentDir, 'html.html'));
    const cssSource = readTextIfExists(path.join(REPO_ROOT, componentDir, 'styles.css'));
    const meta = parseMetaFromSource(source) ?? inferMetaFromPath(relativePath);

    try {
      const existing = await pool.query<{ id: number }>(
        'SELECT id FROM components WHERE slug = $1',
        [componentDir],
      );

      if (existing.rowCount === 0) {
        await pool.query(
          `
          INSERT INTO components (
            slug, name, category, subcategory, type,
            tags, dependencies, source, html_source, css_source
          )
          VALUES ($1, $2, $3, $4, $5, $6::text[], $7::text[], $8, $9, $10)
          `,
          [
            componentDir,
            meta.name,
            meta.category,
            meta.subcategory,
            meta.type || 'react',
            normalizeArray(meta.tags),
            normalizeArray(meta.dependencies),
            source,
            htmlSource,
            cssSource,
          ],
        );
        inserted += 1;
      } else {
        await pool.query(
          `
          UPDATE components
          SET
            name = $2,
            category = $3,
            subcategory = $4,
            type = $5,
            tags = $6::text[],
            dependencies = $7::text[],
            source = $8,
            html_source = $9,
            css_source = $10
          WHERE slug = $1
          `,
          [
            componentDir,
            meta.name,
            meta.category,
            meta.subcategory,
            meta.type || 'react',
            normalizeArray(meta.tags),
            normalizeArray(meta.dependencies),
            source,
            htmlSource,
            cssSource,
          ],
        );
        updated += 1;
      }
    } catch (err) {
      failed += 1;
      console.error(`Failed backfill for ${relativePath}:`, err);
    }
  }

  const total = inserted + updated + failed;
  console.log(`Backfill complete. scanned=${reactEntries.length} processed=${total} inserted=${inserted} updated=${updated} failed=${failed}`);
}

backfill()
  .catch((err) => {
    console.error('Backfill failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
