import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseCheck } from '../src/engine/parser/parseCheck.js';
import type { ParseCheckResult } from '../src/engine/parser/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_ROOT = path.resolve(__dirname, '..', '..');

export function parseCheckFile(relativePath: string): ParseCheckResult {
  const fullPath = path.join(TEMPLATES_ROOT, relativePath);

  if (!fullPath.startsWith(TEMPLATES_ROOT) || !fs.existsSync(fullPath)) {
    return {
      parseOk: false,
      parseErrors: [{ message: `File not found: ${relativePath}`, line: null, column: null }],
    };
  }

  const source = fs.readFileSync(fullPath, 'utf-8');
  return parseCheck(source);
}
