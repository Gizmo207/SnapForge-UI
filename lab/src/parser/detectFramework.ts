export type Framework = "react" | "html";

export function detectFramework(code: string): Framework {
  const hasReactImport = /import\s+.*from\s+['"]react['"]/.test(code);
  const hasUseState = code.includes('useState(');
  return hasReactImport || hasUseState ? "react" : "html";
}
