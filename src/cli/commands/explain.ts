import * as path from 'path';
import chalk from 'chalk';
import { PolicyLoader, findPolicyFile } from '../../core';
import { builtInDetectors } from '../../detectors';

interface ExplainOptions {
  policy?: string;
}

const REMEDIATION_GUIDES: Record<string, string> = {
  'pii-email': `
Remediation:
  1. Remove or redact email addresses before sending to the LLM
  2. Use placeholders like [EMAIL] or [USER_EMAIL] instead
  3. If the email is necessary, consider using a hash or anonymized identifier
  
Example:
  Before: "Contact john.doe@company.com for support"
  After:  "Contact [USER_EMAIL] for support"`,

  'pii-phone': `
Remediation:
  1. Remove or redact phone numbers before sending to the LLM
  2. Use placeholders like [PHONE] instead
  3. If a phone format is needed, use a fake number like 555-0100
  
Example:
  Before: "Call me at 555-123-4567"
  After:  "Call me at [PHONE]"`,

  'pii-ssn': `
Remediation:
  1. NEVER include Social Security Numbers in prompts
  2. Remove all SSN-like patterns from input data
  3. Use anonymized identifiers instead
  
This is a critical security issue - SSNs should never be sent to external LLMs.`,

  'pii-credit-card': `
Remediation:
  1. NEVER include credit card numbers in prompts
  2. Remove all payment card data from input
  3. Use masked formats like **** **** **** 1234 if last 4 digits are needed
  
This is a PCI-DSS compliance issue - card data must never be sent to external systems.`,

  'secrets-api-key': `
Remediation:
  1. Remove all API keys from prompts
  2. Use environment variables or secret managers for API keys
  3. Never hardcode secrets in prompt templates
  
If you need to reference an API, describe it without including the actual key.`,

  'secrets-aws-key': `
Remediation:
  1. Remove all AWS credentials from prompts
  2. Use IAM roles or environment variables instead
  3. Rotate any exposed AWS keys immediately
  
AWS credentials should never appear in prompts or logs.`,

  'secrets-jwt': `
Remediation:
  1. Remove JWT tokens from prompts
  2. Never include authentication tokens in LLM requests
  3. If debugging auth issues, use sanitized examples
  
JWTs contain sensitive claims and should never be exposed.`,

  'no-internal-hostnames': `
Remediation:
  1. Replace internal hostnames with generic descriptions
  2. Use placeholders like [INTERNAL_SERVER] or [DATABASE_HOST]
  3. Remove IP addresses from private ranges (10.x, 192.168.x, etc.)
  
Example:
  Before: "Connect to db.internal.company.com:5432"
  After:  "Connect to [DATABASE_HOST]:[PORT]"`,

  'restricted-terms': `
Remediation:
  1. Replace internal project codenames with generic terms
  2. Use public product names instead of internal names
  3. Review prompts for any confidential business information
  
Example:
  Before: "Update the Project Aurora dashboard"
  After:  "Update the analytics dashboard"`,
};

export const explainCommand = async (policyId: string, options: ExplainOptions): Promise<void> => {
  let policyPath = options.policy;
  
  if (!policyPath) {
    policyPath = findPolicyFile() ?? undefined;
  }

  let policy = null;

  if (policyPath) {
    try {
      const loader = new PolicyLoader();
      await loader.loadFromFile(path.resolve(policyPath));
      const policies = loader.getPolicies();
      policy = policies.find((p) => p.id === policyId);
    } catch (error) {
      // Continue without policy file
    }
  }

  console.log(chalk.bold(`\nPolicy: ${policyId}\n`));

  if (policy) {
    console.log(`Description: ${policy.description}`);
    console.log(`Severity: ${getSeverityColor(policy.severity)(policy.severity)}`);
    console.log(`Match Type: ${policy.match.type}`);
    
    if (policy.match.detector) {
      console.log(`Detector: ${policy.match.detector}`);
      const detector = builtInDetectors[policy.match.detector as keyof typeof builtInDetectors];
      if (detector) {
        console.log(`  ${chalk.dim(detector.description)}`);
      }
    }
    
    if (policy.match.pattern) {
      console.log(`Pattern: ${policy.match.pattern}`);
    }
    
    if (policy.match.terms) {
      console.log(`Terms: ${policy.match.terms.join(', ')}`);
    }
    
    console.log(`Actions: ${policy.actions.map((a) => a.type).join(', ')}`);
  }

  const guide = REMEDIATION_GUIDES[policyId];
  if (guide) {
    console.log(chalk.cyan(guide));
  } else {
    console.log(chalk.dim('\nNo specific remediation guide available for this policy.'));
    console.log(chalk.dim('General guidance:'));
    console.log(chalk.dim('  1. Review the matched content and understand why it triggered'));
    console.log(chalk.dim('  2. Remove or redact sensitive information'));
    console.log(chalk.dim('  3. Use placeholders or anonymized data instead'));
  }

  console.log();
};

const getSeverityColor = (severity: string): chalk.Chalk => {
  switch (severity) {
    case 'error':
      return chalk.red;
    case 'warn':
      return chalk.yellow;
    case 'info':
      return chalk.blue;
    default:
      return chalk.white;
  }
};
