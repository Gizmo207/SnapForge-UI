export type Framework = "react" | "html" | "unknown";

export function detectFramework(code: string): Framework {
  const lower = code.toLowerCase();

  const reactSignals = [
    /import\s.*from\s+['"]react['"]/,
    /import\s.*from\s+['"]styled-components['"]/,
    /import\s.*from\s+['"]framer-motion['"]/,
    /export\s+default\s+function/,
    /export\s+default\s+\w+/,
    /className[={]/,
    /useState|useEffect|useRef|useMemo/,
    /=>\s*\(?\s*</,
    /<\w+[A-Z]\w*/,
  ];

  for (const pattern of reactSignals) {
    if (pattern.test(code)) return "react";
  }

  if (lower.includes("<div") || lower.includes("<button") || lower.includes("<span")) {
    if (lower.includes("class=") && !lower.includes("classname=")) {
      return "html";
    }
    return "react";
  }

  return "unknown";
}
