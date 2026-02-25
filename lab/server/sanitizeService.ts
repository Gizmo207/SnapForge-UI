import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sanitize } from '../src/engine/sanitizer/sanitize.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_ROOT = path.resolve(__dirname, '..', '..');

export type SanitizeServiceResult = {
  sanitized: boolean;
  appliedRules: string[];
};

export function sanitizeFile(relativePath: string): SanitizeServiceResult {
  const fullPath = path.join(TEMPLATES_ROOT, relativePath);

  if (!fullPath.startsWith(TEMPLATES_ROOT) || !fs.existsSync(fullPath)) {
    return { sanitized: false, appliedRules: [] };
  }

  const source = fs.readFileSync(fullPath, 'utf-8');
  const result = sanitize(source);

  if (result.sanitized) {
    fs.writeFileSync(fullPath, result.source, 'utf-8');
  }

  return {
    sanitized: result.sanitized,
    appliedRules: result.appliedRules,
  };
}
