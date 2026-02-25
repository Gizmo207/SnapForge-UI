import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const TSCONFIG_PATH = path.join(ROOT, 'tsconfig.json');

const CATEGORIES = ['primitives', 'components', 'patterns', 'layouts', 'pages', 'foundations'];

function scanForTsxDirectories() {
  const patterns = [];
  
  for (const category of CATEGORIES) {
    const categoryPath = path.join(ROOT, category);
    if (fs.existsSync(categoryPath)) {
      patterns.push(`${category}/**/*.tsx`);
    }
  }
  
  return patterns;
}

function updateTsconfig() {
  const tsconfig = JSON.parse(fs.readFileSync(TSCONFIG_PATH, 'utf-8'));
  const includePatterns = scanForTsxDirectories();
  
  tsconfig.include = includePatterns;
  
  fs.writeFileSync(TSCONFIG_PATH, JSON.stringify(tsconfig, null, 2));
  console.log('Updated tsconfig.json with patterns:', includePatterns);
}

// Run immediately
updateTsconfig();

// Watch for file changes
// Watch for file changes in the parent directory where components actually are
const WATCH_DIR = path.resolve(__dirname, '..', '..');
const watcher = fs.watch(WATCH_DIR, { recursive: true }, (eventType, filename) => {
  if (filename && (filename.endsWith('.tsx') || filename.endsWith('.ts'))) {
    console.log('File change detected, updating tsconfig...');
    updateTsconfig();
  }
});

console.log('Watching for file changes in:', WATCH_DIR);
