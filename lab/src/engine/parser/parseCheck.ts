import { parse } from '@babel/parser';
import type { ParseCheckResult, ParseError } from './types';

export function parseCheck(source: string): ParseCheckResult {
  try {
    parse(source, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });
    return { parseOk: true, parseErrors: [] };
  } catch (err: unknown) {
    const error = err as { message?: string; loc?: { line?: number; column?: number } };
    const parseError: ParseError = {
      message: error.message ?? 'Unknown parse error',
      line: error.loc?.line ?? null,
      column: error.loc?.column ?? null,
    };
    return { parseOk: false, parseErrors: [parseError] };
  }
}
