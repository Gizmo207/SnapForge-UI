import type { RuleFn } from '../types';

const STYLE_OBJECT_REGEX = /style=\{\{([\s\S]*?)\}\}/g;
const DASH_PROP_REGEX = /(^|,)\s*(-{1,2}[A-Za-z_][\w-]*)\s*:/g;

/**
 * Fixes invalid JSX style object keys for CSS custom properties.
 * Example: style={{ -n: 1 }} -> style={{ '--n': 1 }}
 */
export const jsxStyleCustomProps: RuleFn = (source) =>
  source.replace(STYLE_OBJECT_REGEX, (fullMatch, styleBody: string) => {
    const fixedBody = styleBody.replace(DASH_PROP_REGEX, (_match, prefix: string, key: string) => {
      const cssVarKey = key.startsWith('--') ? key : `-${key.replace(/^-+/, '')}`;
      return `${prefix} '${cssVarKey}':`;
    });

    if (fixedBody === styleBody) return fullMatch;
    return `style={{${fixedBody}}}`;
  });

