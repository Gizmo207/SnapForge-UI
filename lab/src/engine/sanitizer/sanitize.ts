import type { RuleFn, SanitizeResult } from './types';
import { classToClassName } from './rules/classToClassName';
import { htmlForAttr } from './rules/htmlForAttr';
import { booleanAttrs } from './rules/booleanAttrs';
import { svgCamelCase } from './rules/svgCamelCase';

const RULES: { name: string; fn: RuleFn }[] = [
  { name: 'classToClassName', fn: classToClassName },
  { name: 'htmlForAttr', fn: htmlForAttr },
  { name: 'booleanAttrs', fn: booleanAttrs },
  { name: 'svgCamelCase', fn: svgCamelCase },
];

export function sanitize(source: string): SanitizeResult {
  let current = source;
  const appliedRules: string[] = [];

  for (const rule of RULES) {
    const result = rule.fn(current);
    if (result !== current) {
      appliedRules.push(rule.name);
      current = result;
    }
  }

  return {
    source: current,
    sanitized: appliedRules.length > 0,
    appliedRules,
  };
}
