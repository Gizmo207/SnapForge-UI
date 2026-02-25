import type { RuleFn } from '../types';

/**
 * Converts HTML `for=` attribute on <label> elements to JSX `htmlFor=`.
 * Only targets `for` when it appears inside a tag context (preceded by whitespace).
 */
const FOR_ATTR_REGEX = /(<label[^>]*)\bfor(?==["'{])/g;

export const htmlForAttr: RuleFn = (source) => {
  return source.replace(FOR_ATTR_REGEX, '$1htmlFor');
};
