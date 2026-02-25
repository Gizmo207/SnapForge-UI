import type { RuleFn } from '../types';

/**
 * Converts string-valued boolean HTML attributes to JSX boolean expressions.
 *
 * Examples:
 *   defaultChecked="anything"  → defaultChecked={true}
 *   disabled="disabled"        → disabled={true}
 *   autoPlay="true"            → autoPlay={true}
 *   readOnly="false"           → readOnly={false}
 */

const BOOLEAN_ATTRS = [
  'autoFocus',
  'autoPlay',
  'checked',
  'controls',
  'default',
  'defaultChecked',
  'defaultMuted',
  'disabled',
  'formNoValidate',
  'hidden',
  'loop',
  'multiple',
  'muted',
  'noValidate',
  'open',
  'playsInline',
  'readOnly',
  'required',
  'reversed',
  'selected',
  'wrap',
];

const FALSY_VALUES = new Set(['false', '0', 'no', 'off', '']);

function buildRegex(): RegExp {
  const names = BOOLEAN_ATTRS.join('|');
  return new RegExp(
    `\\b(${names})=["']([^"']*)["']`,
    'g'
  );
}

const BOOLEAN_REGEX = buildRegex();

export const booleanAttrs: RuleFn = (source) => {
  return source.replace(BOOLEAN_REGEX, (_match, attr: string, value: string) => {
    const boolValue = FALSY_VALUES.has(value.toLowerCase()) ? 'false' : 'true';
    return `${attr}={${boolValue}}`;
  });
};
