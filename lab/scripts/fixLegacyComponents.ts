import { Pool } from 'pg';
import { sanitize } from '../src/engine/sanitizer/sanitize.js';

type ComponentRow = {
  id: number;
  source: string;
  subcategory: string;
};

const DATABASE_URL = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const useSsl = !/localhost|127\.0\.0\.1/i.test(DATABASE_URL);

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});

async function main() {
  const rows = await pool.query<ComponentRow>(
    'SELECT id, source, subcategory FROM components',
  );

  let sourceFixed = 0;
  let subcategoryFixed = 0;

  for (const row of rows.rows) {
    const nextSource = sanitize(row.source || '').source;
    const nextSubcategory = row.subcategory === 'radios' ? 'radio-buttons' : row.subcategory;
    const sourceChanged = nextSource !== row.source;
    const subcategoryChanged = nextSubcategory !== row.subcategory;

    if (!sourceChanged && !subcategoryChanged) continue;

    await pool.query(
      `
        UPDATE components
        SET source = $1, subcategory = $2
        WHERE id = $3
      `,
      [nextSource, nextSubcategory, row.id],
    );

    if (sourceChanged) sourceFixed += 1;
    if (subcategoryChanged) subcategoryFixed += 1;
  }

  console.log(
    `Fix complete. scanned=${rows.rowCount ?? 0} source_fixed=${sourceFixed} subcategory_fixed=${subcategoryFixed}`,
  );
}

main()
  .catch((err) => {
    console.error('Fix failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

