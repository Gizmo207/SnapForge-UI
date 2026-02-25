export type ParseError = {
  message: string;
  line: number | null;
  column: number | null;
};

export type ParseCheckResult = {
  parseOk: boolean;
  parseErrors: ParseError[];
};
