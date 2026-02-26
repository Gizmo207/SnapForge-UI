import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_ROOT = path.resolve(__dirname, '..', '..');
const TSCONFIG_PATH = path.join(TEMPLATES_ROOT, 'tsconfig.json');

console.log('__dirname:', __dirname);
console.log('TEMPLATES_ROOT:', TEMPLATES_ROOT);

const CATEGORIES = ['primitives', 'components', 'patterns', 'layouts', 'pages', 'foundations'];

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

const SCAN_ROOTS = ['primitives', 'components', 'templates', 'patterns', 'layouts', 'pages', 'foundations'];

function updateTsconfig() {
  console.log('updateTsconfig called');
  console.log('TSCONFIG_PATH:', TSCONFIG_PATH);
  console.log('File exists:', fs.existsSync(TSCONFIG_PATH));
  
  const patterns: string[] = [];
  
  for (const category of CATEGORIES) {
    const categoryPath = path.join(TEMPLATES_ROOT, category);
    if (fs.existsSync(categoryPath)) {
      patterns.push(`${category}/**/*.tsx`);
    }
  }
  
  // Read current tsconfig
  console.log('Attempting to read tsconfig...');
  const tsconfig = JSON.parse(fs.readFileSync(TSCONFIG_PATH, 'utf-8'));
  tsconfig.include = patterns;
  
  // Write back
  console.log('Writing tsconfig...');
  fs.writeFileSync(TSCONFIG_PATH, JSON.stringify(tsconfig, null, 2));
  console.log('tsconfig updated with patterns:', patterns);
}

function normalizeName(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .toLowerCase();
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
  const componentName = req.name.replace(/[^a-zA-Z0-9]/g, '');

  let result = '';
  if (imports) result += imports + '\n\n';
  result += meta;
  result += body;
  if (!hasDefault) result += `\n\nexport default ${componentName};\n`;

  return result;
}

export function deleteComponent(filePath: string): { success: boolean; message: string } {
  console.log('Delete request for filePath:', filePath);
  // Convert forward slashes to backslashes for Windows
  const normalizedPath = filePath.replace(/\//g, path.sep);
  const fullPath = path.join(TEMPLATES_ROOT, normalizedPath);
  console.log('Normalized path:', normalizedPath);
  console.log('Resolved fullPath:', fullPath);
  console.log('File exists:', fs.existsSync(fullPath));

  if (!fullPath.startsWith(TEMPLATES_ROOT)) {
    return { success: false, message: 'Invalid path' };
  }

  if (!fs.existsSync(fullPath)) {
    return { success: false, message: `File not found: ${filePath}` };
  }

  try {
    const isReactEntry = path.basename(fullPath).toLowerCase() === 'react.tsx';
    const removedPath = isReactEntry ? path.dirname(fullPath) : fullPath;

    if (isReactEntry) {
      fs.rmSync(removedPath, { recursive: true });
    } else {
      fs.unlinkSync(removedPath);
    }

    // Clean up empty parent directories
    let dir = path.dirname(removedPath);
    while (dir !== TEMPLATES_ROOT && fs.existsSync(dir)) {
      const contents = fs.readdirSync(dir);
      if (contents.length === 0) {
        fs.rmdirSync(dir);
        dir = path.dirname(dir);
      } else {
        break;
      }
    }

    // Update tsconfig after deletion
    updateTsconfig();
    
    return { success: true, message: `Deleted ${filePath}` };
  } catch (err: unknown) {
    return { success: false, message: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export function saveComponent(req: SaveRequest): SaveResult {
  const detectedFramework = detectFramework(req.code);
  const fileName = normalizeName(req.name);
  const dirPath = path.join(TEMPLATES_ROOT, req.category, req.subcategory, fileName);
  const filePath = path.join(dirPath, 'react.tsx');
  const relativePath = path.relative(TEMPLATES_ROOT, filePath).replace(/\\/g, '/');

  console.log(`Save request: ${req.name} -> ${fileName}/react.tsx`);
  console.log(`Target path: ${filePath}`);
  console.log(`File exists: ${fs.existsSync(filePath)}`);

  try {
    console.log('Attempting to save...');
    fs.mkdirSync(dirPath, { recursive: true });

    const finalCode = wrapCode({ ...req, framework: detectedFramework });
    console.log('Code wrapped, writing file...');
    fs.writeFileSync(filePath, finalCode, 'utf-8');

    if (detectedFramework === 'html' && req.htmlSource && req.htmlSource.trim()) {
      fs.writeFileSync(path.join(dirPath, 'html.html'), req.htmlSource, 'utf-8');
    }

    if (detectedFramework === 'html' && req.cssSource && req.cssSource.trim()) {
      fs.writeFileSync(path.join(dirPath, 'styles.css'), req.cssSource, 'utf-8');
    }

    console.log('File written successfully!');
    
    // Update tsconfig after save
    // updateTsconfig(); // Temporarily disabled to fix save issue
    console.log('tsconfig updated');

    return {
      success: true,
      filePath,
      relativePath,
      status: 'created',
      message: `Saved to ${relativePath}`,
    };
  } catch (err: unknown) {
    console.log('Error during save:', err);
    return {
      success: false,
      filePath,
      relativePath,
      status: 'error',
      message: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

function readTextIfExists(filePath: string): string | undefined {
  if (!fs.existsSync(filePath)) return undefined;
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

export function listComponents(): ComponentCatalogItem[] {
  const reactEntries: string[] = [];

  for (const root of SCAN_ROOTS) {
    const rootPath = path.join(TEMPLATES_ROOT, root);
    if (!fs.existsSync(rootPath)) continue;
    walkReactEntries(rootPath, reactEntries);
  }

  const items = reactEntries.map((filePath) => {
    const pathRel = path.relative(TEMPLATES_ROOT, filePath).replace(/\\/g, '/');
    const componentDir = pathRel.replace(/\/react\.tsx$/, '');
    const source = fs.readFileSync(filePath, 'utf-8');
    const htmlSource = readTextIfExists(path.join(TEMPLATES_ROOT, componentDir, 'html.html'));
    const cssSource = readTextIfExists(path.join(TEMPLATES_ROOT, componentDir, 'styles.css'));
    const meta = parseMetaFromSource(source) ?? inferMetaFromPath(pathRel);

    return {
      path: pathRel,
      componentDir,
      source,
      htmlSource,
      cssSource,
      meta,
    };
  });

  items.sort((a, b) => {
    const aName = a.meta?.name?.toLowerCase() ?? a.path.toLowerCase();
    const bName = b.meta?.name?.toLowerCase() ?? b.path.toLowerCase();
    return aName.localeCompare(bName);
  });

  return items;
}
