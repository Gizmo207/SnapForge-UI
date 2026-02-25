export type RuleFn = (source: string) => string;

export type RuleResult = {
  name: string;
  applied: boolean;
};

export type SanitizeResult = {
  source: string;
  sanitized: boolean;
  appliedRules: string[];
};
