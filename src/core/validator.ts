import { 
  Policy, 
  ValidationResult, 
  Violation, 
  PromptContext,
  BuiltInDetector 
} from '../types';
import { PolicyLoader } from './policy-loader';
import { 
  getDetector, 
  createCustomRegexDetector, 
  createTermListDetector 
} from '../detectors';

export class PromptValidator {
  private policies: Policy[] = [];
  private policyLoader: PolicyLoader;

  constructor() {
    this.policyLoader = new PolicyLoader();
  }

  async loadPolicies(policyPath: string, environment?: string): Promise<void> {
    await this.policyLoader.loadFromFile(policyPath);
    this.policies = this.policyLoader.getPolicies(environment);
  }

  loadPoliciesFromString(content: string, format: 'yaml' | 'json' = 'yaml', environment?: string): void {
    this.policyLoader.loadFromString(content, format);
    this.policies = this.policyLoader.getPolicies(environment);
  }

  validate(prompt: string, context?: PromptContext): ValidationResult {
    const violations: Violation[] = [];

    for (const policy of this.policies) {
      const policyViolations = this.checkPolicy(prompt, policy, context);
      violations.push(...policyViolations);
    }

    const hasBlockingViolation = violations.some(
      (v) => v.severity === 'error' || v.actions.some((a) => a.type === 'block')
    );

    const redactedPrompt = this.generateRedactedPrompt(prompt, violations);

    return {
      allowed: !hasBlockingViolation,
      violations,
      summary: this.generateSummary(violations),
      redactedPrompt: redactedPrompt !== prompt ? redactedPrompt : undefined,
    };
  }

  private checkPolicy(prompt: string, policy: Policy, context?: PromptContext): Violation[] {
    const violations: Violation[] = [];

    if (policy.applies_to?.contexts && context?.source) {
      if (!policy.applies_to.contexts.includes(context.source)) {
        return violations;
      }
    }

    const matches = this.findMatches(prompt, policy);

    for (const match of matches) {
      const messageAction = policy.actions.find((a) => a.type === 'message');
      
      violations.push({
        policyId: policy.id,
        description: policy.description,
        severity: policy.severity,
        match,
        actions: policy.actions,
        message: messageAction?.text,
      });
    }

    return violations;
  }

  private findMatches(text: string, policy: Policy): Array<{ text: string; start: number; end: number }> {
    const matches: Array<{ text: string; start: number; end: number }> = [];

    switch (policy.match.type) {
      case 'regex': {
        if (policy.match.pattern) {
          const detector = createCustomRegexDetector(
            policy.id,
            policy.description,
            policy.match.pattern
          );
          const result = detector.detect(text);
          matches.push(...result.matches);
        }
        break;
      }

      case 'built_in': {
        if (policy.match.detector) {
          const detector = getDetector(policy.match.detector as BuiltInDetector);
          if (detector) {
            const result = detector.detect(text);
            matches.push(...result.matches);
          }
        }
        break;
      }

      case 'list': {
        if (policy.match.terms && policy.match.terms.length > 0) {
          const detector = createTermListDetector(
            policy.id,
            policy.description,
            policy.match.terms,
            policy.match.case_sensitive ?? false
          );
          const result = detector.detect(text);
          matches.push(...result.matches);
        }
        break;
      }
    }

    return matches;
  }

  private generateRedactedPrompt(prompt: string, violations: Violation[]): string {
    const redactViolations = violations.filter((v) =>
      v.actions.some((a) => a.type === 'suggest_redact')
    );

    if (redactViolations.length === 0) {
      return prompt;
    }

    const sortedMatches = redactViolations
      .map((v) => v.match)
      .sort((a, b) => b.start - a.start);

    let redacted = prompt;
    for (const match of sortedMatches) {
      const replacement = '[REDACTED]';
      redacted = redacted.slice(0, match.start) + replacement + redacted.slice(match.end);
    }

    return redacted;
  }

  private generateSummary(violations: Violation[]): string {
    if (violations.length === 0) {
      return 'No policy violations found.';
    }

    const errorCount = violations.filter((v) => v.severity === 'error').length;
    const warnCount = violations.filter((v) => v.severity === 'warn').length;
    const infoCount = violations.filter((v) => v.severity === 'info').length;

    const parts: string[] = [];
    if (errorCount > 0) parts.push(`${errorCount} error(s)`);
    if (warnCount > 0) parts.push(`${warnCount} warning(s)`);
    if (infoCount > 0) parts.push(`${infoCount} info`);

    return `Found ${violations.length} violation(s): ${parts.join(', ')}.`;
  }

  getPolicies(): Policy[] {
    return [...this.policies];
  }
}

export interface ValidatorOptions {
  policyPath?: string;
  policyContent?: string;
  policyFormat?: 'yaml' | 'json';
  environment?: string;
}

export const createValidator = async (options: ValidatorOptions): Promise<PromptValidator> => {
  const validator = new PromptValidator();

  if (options.policyPath) {
    await validator.loadPolicies(options.policyPath, options.environment);
  } else if (options.policyContent) {
    validator.loadPoliciesFromString(
      options.policyContent,
      options.policyFormat ?? 'yaml',
      options.environment
    );
  }

  return validator;
};
