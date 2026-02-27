type NameContext = {
  category: string;
  subcategory: string;
  tags: string[];
};

const GENERIC_NAMES = new Set([
  "button", "switch", "component", "box", "card", "wrapper",
  "container", "item", "element", "app", "main", "root",
  "styled", "styledwrapper",
]);

const STYLE_PREFIXES: { tag: string; prefix: string }[] = [
  { tag: "animation", prefix: "Animated" },
  { tag: "glass", prefix: "Glass" },
  { tag: "neon", prefix: "Neon" },
  { tag: "glitch", prefix: "Glitch" },
  { tag: "3d", prefix: "3D" },
  { tag: "gradient", prefix: "Gradient" },
  { tag: "pulse", prefix: "Pulsing" },
  { tag: "skeleton", prefix: "Skeleton" },
  { tag: "icon", prefix: "Icon" },
];

const SUBCATEGORY_LABELS: Record<string, string> = {
  buttons: "Button",
  checkboxes: "Checkbox",
  toggles: "Toggle",
  loaders: "Loader",
  inputs: "Input",
  "radio-buttons": "Radio Button",
  radios: "Radio",
  badges: "Badge",
  tooltips: "Tooltip",
  cards: "Card",
  modals: "Modal",
  dropdowns: "Dropdown",
  accordions: "Accordion",
  tabs: "Tab",
  navbars: "Navbar",
  sidebars: "Sidebar",
  heroes: "Hero",
  forms: "Form",
  headers: "Header",
  footers: "Footer",
  grids: "Grid",
  backgrounds: "Pattern",
  misc: "Component",
};

function extractBaseName(code: string): string | null {
  const patterns = [
    /export\s+default\s+function\s+([A-Z][A-Za-z0-9_]*)/,
    /function\s+([A-Z][A-Za-z0-9_]*)\s*\(/,
    /const\s+([A-Z][A-Za-z0-9_]*)\s*=\s*\(\s*\)\s*=>/,
    /const\s+([A-Z][A-Za-z0-9_]*)\s*=\s*\(/,
    /const\s+([A-Z][A-Za-z0-9_]*)\s*=/,
  ];

  for (const pattern of patterns) {
    const match = code.match(pattern);
    if (match) {
      const name = match[1];
      if (!GENERIC_NAMES.has(name.toLowerCase())) {
        return name;
      }
    }
  }

  return null;
}

function splitCamelCase(name: string): string[] {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[\s_-]+/)
    .filter(Boolean);
}

export function inferName(code: string, context: NameContext): string {
  const baseName = extractBaseName(code);

  if (baseName) {
    const words = splitCamelCase(baseName);
    if (words.length >= 2) {
      return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }
  }

  // Build name from style prefix + subcategory label
  const subLabel = SUBCATEGORY_LABELS[context.subcategory] || "Component";

  // Pick the best style prefix (first match)
  let prefix = "";
  for (const rule of STYLE_PREFIXES) {
    if (context.tags.includes(rule.tag)) {
      prefix = rule.prefix;
      break;
    }
  }

  if (prefix) {
    return `${prefix} ${subLabel}`;
  }

  // Fallback: use base name even if generic, with subcategory context
  if (baseName) {
    return `${subLabel} ${baseName}`;
  }

  return subLabel;
}
