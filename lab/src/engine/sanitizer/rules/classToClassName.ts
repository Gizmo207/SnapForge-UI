import type { RuleFn } from '../types';

/**
 * Converts HTML `class=` attributes to JSX `className=`.
 * Skips occurrences inside string literals and comments.
 * Matches: class="..." | class='...' | class={...}
 */
const CLASS_ATTR_REGEX = /(<[a-zA-Z][^>]*)\bclass(?==["'{])/g;

export const classToClassName: RuleFn = (source) => {
  return source.replace(CLASS_ATTR_REGEX, '$1className');
};
