export type Classification = {
  category: string;
  subcategory: string;
  tags: string[];
};

type Rule = {
  pattern: RegExp | ((code: string) => boolean);
  category: string;
  subcategory: string;
  tag: string;
  priority: number;
};

const rules: Rule[] = [
  // ── Structural Detection (Highest Priority) ───────────────────
  // Form + Input → forms pattern (NOT buttons)
  { pattern: (code) => /<form/i.test(code) && /<input/i.test(code), category: "patterns", subcategory: "forms", tag: "form", priority: 20 },
  // Input as root element → inputs (NOT buttons)
  { pattern: (code) => code.trim().startsWith('<input'), category: "primitives", subcategory: "inputs", tag: "input", priority: 19 },
  // Button as root element → buttons
  { pattern: (code) => code.trim().startsWith('<button'), category: "primitives", subcategory: "buttons", tag: "button", priority: 18 },

  // ── Checkboxes ──────────────────────────────────────────────
  { pattern: /input.*type=["']checkbox["']/i, category: "primitives", subcategory: "checkboxes", tag: "checkbox", priority: 11 },
  { pattern: /checkbox/i, category: "primitives", subcategory: "checkboxes", tag: "checkbox", priority: 10 },
  { pattern: /check-box/i, category: "primitives", subcategory: "checkboxes", tag: "checkbox", priority: 10 },
  { pattern: /checkmark/i, category: "primitives", subcategory: "checkboxes", tag: "checkbox", priority: 8 },

  // ── Toggle Switches ────────────────────────────────────────
  { pattern: /toggle/i, category: "primitives", subcategory: "toggles", tag: "toggle", priority: 10 },
  { pattern: /switch/i, category: "primitives", subcategory: "toggles", tag: "toggle", priority: 9 },
  { pattern: /on-off|onoff/i, category: "primitives", subcategory: "toggles", tag: "toggle", priority: 8 },

  // ── Radio Buttons ──────────────────────────────────────────
  { pattern: /input.*type=["']radio["']/i, category: "primitives", subcategory: "radios", tag: "radio", priority: 11 },
  { pattern: /radio/i, category: "primitives", subcategory: "radios", tag: "radio", priority: 10 },
  { pattern: /radio-group|radiogroup/i, category: "primitives", subcategory: "radios", tag: "radio", priority: 10 },
  { pattern: /radio-button|radiobutton/i, category: "primitives", subcategory: "radios", tag: "radio", priority: 10 },

  // ── Inputs ─────────────────────────────────────────────────
  // High priority: Input elements with search-related attributes
  { pattern: /input.*type=["']search["']/i, category: "primitives", subcategory: "inputs", tag: "input", priority: 12 },
  { pattern: /input.*placeholder=["'][^"']*search/i, category: "primitives", subcategory: "inputs", tag: "input", priority: 12 },
  { pattern: /input.*name=["']q["']/i, category: "primitives", subcategory: "inputs", tag: "input", priority: 12 },
  { pattern: /input.*type=["']password["']/i, category: "primitives", subcategory: "inputs", tag: "input", priority: 8 },
  { pattern: /input.*type=["']email["']/i, category: "primitives", subcategory: "inputs", tag: "input", priority: 8 },
  { pattern: /input.*type=["']number["']/i, category: "primitives", subcategory: "inputs", tag: "input", priority: 8 },
  { pattern: /input.*type=["']url["']/i, category: "primitives", subcategory: "inputs", tag: "input", priority: 8 },
  { pattern: /input.*type=["']tel["']/i, category: "primitives", subcategory: "inputs", tag: "input", priority: 8 },
  { pattern: /<textarea/i, category: "primitives", subcategory: "inputs", tag: "textarea", priority: 8 },
  { pattern: /text-field|textfield/i, category: "primitives", subcategory: "inputs", tag: "input", priority: 8 },
  { pattern: /input-field|inputfield/i, category: "primitives", subcategory: "inputs", tag: "input", priority: 8 },
  { pattern: /placeholder/i, category: "primitives", subcategory: "inputs", tag: "input", priority: 4 },
  { pattern: /<input/i, category: "primitives", subcategory: "inputs", tag: "input", priority: 3 },

  // ── Buttons ────────────────────────────────────────────────
  { pattern: /<button/i, category: "primitives", subcategory: "buttons", tag: "button", priority: 8 },
  { pattern: /button/i, category: "primitives", subcategory: "buttons", tag: "button", priority: 6 },
  { pattern: /\.btn\b|class=["'][^"']*\bbtn\b/i, category: "primitives", subcategory: "buttons", tag: "button", priority: 7 },
  { pattern: /role=["']button["']/i, category: "primitives", subcategory: "buttons", tag: "button", priority: 9 },
  { pattern: /onClick|on-click/i, category: "primitives", subcategory: "buttons", tag: "button", priority: 3 },

  // ── Loaders / Spinners ─────────────────────────────────────
  { pattern: /loader/i, category: "primitives", subcategory: "loaders", tag: "loader", priority: 9 },
  { pattern: /spinner/i, category: "primitives", subcategory: "loaders", tag: "loader", priority: 9 },
  { pattern: /loading/i, category: "primitives", subcategory: "loaders", tag: "loader", priority: 7 },
  { pattern: /skeleton/i, category: "primitives", subcategory: "loaders", tag: "skeleton", priority: 7 },
  { pattern: /progress/i, category: "primitives", subcategory: "loaders", tag: "progress", priority: 6 },
  { pattern: /pulse.*dot|dot.*pulse/i, category: "primitives", subcategory: "loaders", tag: "loader", priority: 7 },
  { pattern: /bounce/i, category: "primitives", subcategory: "loaders", tag: "loader", priority: 5 },

  // ── Badges ─────────────────────────────────────────────────
  { pattern: /badge/i, category: "primitives", subcategory: "badges", tag: "badge", priority: 8 },
  { pattern: /chip/i, category: "primitives", subcategory: "badges", tag: "badge", priority: 7 },
  { pattern: /tag/i, category: "primitives", subcategory: "badges", tag: "badge", priority: 4 },

  // ── Tooltips ───────────────────────────────────────────────
  { pattern: /tooltip/i, category: "primitives", subcategory: "tooltips", tag: "tooltip", priority: 9 },
  { pattern: /popover/i, category: "primitives", subcategory: "tooltips", tag: "popover", priority: 8 },
  { pattern: /title=["']/i, category: "primitives", subcategory: "tooltips", tag: "tooltip", priority: 3 },

  // ── Cards ──────────────────────────────────────────────────
  { pattern: /card/i, category: "components", subcategory: "cards", tag: "card", priority: 7 },
  { pattern: /tile/i, category: "components", subcategory: "cards", tag: "card", priority: 5 },
  { pattern: /panel/i, category: "components", subcategory: "cards", tag: "card", priority: 4 },

  // ── Modals ─────────────────────────────────────────────────
  { pattern: /modal/i, category: "components", subcategory: "modals", tag: "modal", priority: 8 },
  { pattern: /dialog/i, category: "components", subcategory: "modals", tag: "dialog", priority: 7 },
  { pattern: /overlay/i, category: "components", subcategory: "modals", tag: "modal", priority: 5 },

  // ── Dropdowns ──────────────────────────────────────────────
  { pattern: /dropdown/i, category: "components", subcategory: "dropdowns", tag: "dropdown", priority: 8 },
  { pattern: /select.*option/i, category: "components", subcategory: "dropdowns", tag: "select", priority: 5 },
  { pattern: /menu/i, category: "components", subcategory: "dropdowns", tag: "menu", priority: 4 },

  // ── Accordions ─────────────────────────────────────────────
  { pattern: /accordion/i, category: "components", subcategory: "accordions", tag: "accordion", priority: 8 },
  { pattern: /collapsible/i, category: "components", subcategory: "accordions", tag: "accordion", priority: 7 },
  { pattern: /expandable/i, category: "components", subcategory: "accordions", tag: "accordion", priority: 6 },

  // ── Tabs ───────────────────────────────────────────────────
  { pattern: /tab-/i, category: "components", subcategory: "tabs", tag: "tabs", priority: 7 },
  { pattern: /\.tabs?\b/i, category: "components", subcategory: "tabs", tag: "tabs", priority: 5 },

  // ── Navigation ─────────────────────────────────────────────
  { pattern: /navbar/i, category: "patterns", subcategory: "navbars", tag: "navigation", priority: 9 },
  { pattern: /<nav/i, category: "patterns", subcategory: "navbars", tag: "navigation", priority: 8 },
  { pattern: /navigation/i, category: "patterns", subcategory: "navbars", tag: "navigation", priority: 7 },
  { pattern: /sidebar/i, category: "patterns", subcategory: "sidebars", tag: "sidebar", priority: 8 },

  // ── Heroes ─────────────────────────────────────────────────
  { pattern: /hero/i, category: "patterns", subcategory: "heroes", tag: "hero", priority: 8 },
  { pattern: /landing/i, category: "patterns", subcategory: "heroes", tag: "hero", priority: 5 },

  // ── Forms ──────────────────────────────────────────────────
  { pattern: /<form/i, category: "patterns", subcategory: "forms", tag: "form", priority: 9 },
  { pattern: /form/i, category: "patterns", subcategory: "forms", tag: "form", priority: 7 },
  { pattern: /onSubmit|on-submit|handleSubmit/i, category: "patterns", subcategory: "forms", tag: "form", priority: 8 },
  { pattern: /login|sign-in|signin/i, category: "patterns", subcategory: "forms", tag: "form", priority: 7 },
  { pattern: /signup|sign-up|register/i, category: "patterns", subcategory: "forms", tag: "form", priority: 7 },
  { pattern: /contact-form|contactform/i, category: "patterns", subcategory: "forms", tag: "form", priority: 9 },
  { pattern: /search-bar|searchbar/i, category: "patterns", subcategory: "forms", tag: "form", priority: 7 },

  // ── Headers / Footers ──────────────────────────────────────
  { pattern: /<header/i, category: "patterns", subcategory: "headers", tag: "header", priority: 7 },
  { pattern: /<footer/i, category: "patterns", subcategory: "footers", tag: "footer", priority: 7 },

  // ── Backgrounds / Decorative Patterns ──────────────────────
  { pattern: /grid-pattern|dot-pattern|dot-grid/i, category: "patterns", subcategory: "backgrounds", tag: "pattern", priority: 8 },
  { pattern: /matrix/i, category: "patterns", subcategory: "backgrounds", tag: "pattern", priority: 7 },
  { pattern: /particles?/i, category: "patterns", subcategory: "backgrounds", tag: "particles", priority: 7 },
  { pattern: /aurora/i, category: "patterns", subcategory: "backgrounds", tag: "aurora", priority: 7 },
  { pattern: /starfield|stars/i, category: "patterns", subcategory: "backgrounds", tag: "stars", priority: 7 },
  { pattern: /pattern/i, category: "patterns", subcategory: "backgrounds", tag: "pattern", priority: 6 },
  { pattern: /ripple/i, category: "patterns", subcategory: "backgrounds", tag: "ripple", priority: 6 },
  { pattern: /confetti/i, category: "patterns", subcategory: "backgrounds", tag: "confetti", priority: 7 },
  { pattern: /background/i, category: "patterns", subcategory: "backgrounds", tag: "background", priority: 5 },
  { pattern: /wave/i, category: "patterns", subcategory: "backgrounds", tag: "wave", priority: 5 },
  { pattern: /canvas/i, category: "patterns", subcategory: "backgrounds", tag: "canvas", priority: 4 },

  // ── Layout ─────────────────────────────────────────────────
  { pattern: /position:\s*fixed/i, category: "layouts", subcategory: "fixed", tag: "fixed-layout", priority: 4 },
  { pattern: /display:\s*grid/i, category: "layouts", subcategory: "grids", tag: "grid", priority: 3 },
];

// Tag-only rules (don't affect category, just add tags)
const tagRules: { pattern: RegExp; tag: string }[] = [
  { pattern: /@keyframes/i, tag: "animation" },
  { pattern: /animation:/i, tag: "animation" },
  { pattern: /transition:/i, tag: "transition" },
  { pattern: /<svg/i, tag: "icon" },
  { pattern: /hover/i, tag: "hover" },
  { pattern: /glass/i, tag: "glass" },
  { pattern: /gradient/i, tag: "gradient" },
  { pattern: /blur/i, tag: "blur" },
  { pattern: /shadow/i, tag: "shadow" },
  { pattern: /border-radius.*50%/i, tag: "rounded" },
  { pattern: /3d|perspective|rotateX|rotateY/i, tag: "3d" },
  { pattern: /neon|glow/i, tag: "neon" },
  { pattern: /glitch/i, tag: "glitch" },
  { pattern: /pulse|pulsate/i, tag: "pulse" },
  { pattern: /skeleton/i, tag: "skeleton" },
  { pattern: /dark|#0[0-3]/i, tag: "dark" },
];

export function classifyComponent(code: string): Classification {
  const matchedRules: Rule[] = [];

  for (const rule of rules) {
    const matches = rule.pattern instanceof RegExp
      ? rule.pattern.test(code)
      : rule.pattern(code);
    if (matches) matchedRules.push(rule);
  }

  // Sort by priority descending, pick the best match
  matchedRules.sort((a, b) => b.priority - a.priority);

  const best = matchedRules[0];
  const category = best?.category ?? "components";
  const subcategory = best?.subcategory ?? "misc";

  // Collect tags from classification rules
  const tags = new Set<string>();
  for (const rule of matchedRules) {
    tags.add(rule.tag);
  }

  // Collect tags from tag-only rules
  for (const rule of tagRules) {
    if (rule.pattern.test(code)) {
      tags.add(rule.tag);
    }
  }

  return {
    category,
    subcategory,
    tags: Array.from(tags).sort(),
  };
}
