export type Severity = 'error' | 'warn' | 'info';

export type MatchType = 'regex' | 'built_in' | 'list';

export type ActionType = 'block' | 'warn' | 'annotate' | 'suggest_redact' | 'message' | 'tag';

export type BuiltInDetector = 
  | 'email' 
  | 'phone' 
  | 'ssn' 
  | 'credit_card' 
  | 'ipv4' 
  | 'ipv6'
  | 'url'
  | 'api_key'
  | 'aws_key'
  | 'jwt';

export interface MatchConfig {
  type: MatchType;
  pattern?: string;
  detector?: BuiltInDetector;
  terms?: string[];
  case_sensitive?: boolean;
}

export interface ActionConfig {
  type: ActionType;
  text?: string;
  tag?: string;
}

export interface AppliesTo {
  contexts?: string[];
  files?: {
    include?: string[];
    exclude?: string[];
  };
}

export interface Policy {
  id: string;
  description: string;
  severity: Severity;
  match: MatchConfig;
  applies_to?: AppliesTo;
  actions: ActionConfig[];
  enabled?: boolean;
}

export interface PolicyOverride {
  env?: string;
  disable_policies?: string[];
  enable_policies?: string[];
}

export interface PolicyFile {
  version: number;
  policies: Policy[];
  overrides?: PolicyOverride[];
}

export interface Violation {
  policyId: string;
  description: string;
  severity: Severity;
  match: {
    text: string;
    start: number;
    end: number;
  };
  actions: ActionConfig[];
  message?: string;
}

export interface ValidationResult {
  allowed: boolean;
  violations: Violation[];
  summary: string;
  redactedPrompt?: string;
}

export interface PromptContext {
  source?: string;
  userId?: string;
  environment?: string;
  metadata?: Record<string, unknown>;
}

export interface ScanResult {
  file: string;
  violations: Violation[];
  scannedAt: Date;
}

export interface ScanSummary {
  totalFiles: number;
  filesWithViolations: number;
  totalViolations: number;
  errorCount: number;
  warnCount: number;
  infoCount: number;
  results: ScanResult[];
}

export interface DetectorResult {
  matched: boolean;
  matches: Array<{
    text: string;
    start: number;
    end: number;
  }>;
}

export interface Detector {
  name: string;
  description: string;
  detect(text: string): DetectorResult;
}

export type OutputFormat = 'text' | 'json' | 'sarif';

export interface CLIOptions {
  policy?: string;
  format?: OutputFormat;
  failOn?: Severity;
  verbose?: boolean;
}
