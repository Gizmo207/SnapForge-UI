import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_ROOT = path.resolve(__dirname, '..', '..', '..', 'templates');
const TSCONFIG_PATH = path.join(TEMPLATES_ROOT, 'tsconfig.json');

console.log('__dirname:', __dirname);
console.log('TEMPLATES_ROOT:', TEMPLATES_ROOT);

const CATEGORIES = ['primitives', 'components', 'patterns', 'layouts', 'pages', 'foundations'];

export type SaveRequest = {
  name: string;
  code: string;
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

    const finalCode = wrapCode(req);
    console.log('Code wrapped, writing file...');
    fs.writeFileSync(filePath, finalCode, 'utf-8');
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
