---
name: promptlint-compliance
description: Validates LLM prompts against enterprise compliance policies using PromptLint. Use this skill when you need to check prompts for PII (emails, phone numbers, SSNs, credit cards), secrets (API keys, AWS keys, JWTs), or custom policy violations before sending them to AI providers. This skill helps ensure prompts comply with security and privacy requirements.
license: Apache-2.0
compatibility: Requires Node.js 18+ and npm. Works on Linux, macOS, and Windows.
metadata:
  author: youcommit
  version: "1.0"
  repository: https://github.com/youcommit/promptlint
  keywords:
    - compliance
    - security
    - pii-detection
    - prompt-validation
    - policy-as-code
---

# PromptLint Compliance Skill

This skill enables you to validate LLM prompts against enterprise compliance policies before they are sent to AI providers. It detects PII, secrets, and custom policy violations.

## When to Use This Skill

Use this skill when:
- You need to check prompts for sensitive information (PII, secrets) before sending to LLMs
- You want to enforce compliance policies on prompt content
- You need to scan prompt templates in a codebase for policy violations
- You want to set up CI/CD validation for prompt files

## Installation

First, ensure PromptLint is installed:

```bash
npm install -g promptlint
```

Or install locally in a project:

```bash
npm install promptlint
```

## Core Commands

### Initialize a Policy File

Create a starter policy configuration:

```bash
promptlint init
```

This creates a `prompt-policy.yml` file with recommended rules for PII and secrets detection.

### Scan Prompts for Violations

Scan prompt files in a directory:

```bash
promptlint scan .
promptlint scan ./prompts --policy ./my-policy.yml
```

### Validate a Policy File

Check if a policy file is valid:

```bash
promptlint validate-policy
promptlint validate-policy ./custom-policy.yml
```

### List Available Detectors

View all built-in detectors:

```bash
promptlint list-detectors
```

### Get Policy Explanation

Get detailed information about a specific policy:

```bash
promptlint explain pii-email
promptlint explain secrets-api-key
```

## Built-in Detectors

PromptLint includes these built-in detectors:

| Detector | Description |
|----------|-------------|
| `email` | Email addresses |
| `phone` | Phone numbers (US format) |
| `ssn` | US Social Security Numbers |
| `credit_card` | Credit card numbers |
| `ipv4` | IPv4 addresses |
| `ipv6` | IPv6 addresses |
| `url` | URLs |
| `api_key` | Common API key patterns |
| `aws_key` | AWS access keys |
| `jwt` | JWT tokens |

## Policy Configuration

Policies are defined in YAML format. Here's an example policy file:

```yaml
version: 1

policies:
  # Detect email addresses
  - id: pii-email
    description: "Detect email addresses in prompts"
    severity: warn
    match:
      type: built_in
      detector: email
    actions:
      - type: annotate
      - type: suggest_redact

  # Block API keys
  - id: secrets-api-key
    description: "Block prompts containing API keys"
    severity: error
    match:
      type: built_in
      detector: api_key
    actions:
      - type: block
      - type: message
        text: "Remove API keys before sending to external LLMs"

  # Custom regex pattern
  - id: no-internal-hostnames
    description: "Block internal hostnames"
    severity: error
    match:
      type: regex
      pattern: "(?:\\.internal\\.|corp\\.)"
    actions:
      - type: block

  # Block specific terms
  - id: restricted-terms
    description: "Block internal project codenames"
    severity: error
    match:
      type: list
      terms:
        - "Project Aurora"
        - "Internal Codename"
      case_sensitive: false
    actions:
      - type: block
```

## Output Formats

PromptLint supports multiple output formats:

- **text** (default): Human-readable colored output
- **json**: Machine-readable JSON for tool integration
- **sarif**: For GitHub Code Scanning integration

```bash
promptlint scan . --format json
promptlint scan . --format sarif > results.sarif
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Prompt Lint

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install PromptLint
        run: npm install -g promptlint
      
      - name: Run PromptLint
        run: promptlint scan . --fail-on error
```

## SDK Usage (TypeScript/JavaScript)

For runtime validation in your application:

```typescript
import { createValidator } from 'promptlint';

const validator = await createValidator({
  policyPath: './prompt-policy.yml'
});

const result = validator.validate(userPrompt);

if (!result.allowed) {
  console.error('Prompt blocked:', result.summary);
  console.error('Violations:', result.violations);
} else {
  // Safe to send to LLM
  const safePrompt = result.redactedPrompt ?? userPrompt;
  await sendToLLM(safePrompt);
}
```

## Best Practices

1. **Start with built-in detectors**: Use the built-in PII and secrets detectors as a baseline
2. **Add custom policies**: Extend with organization-specific rules for internal terms, hostnames, etc.
3. **Use environment overrides**: Configure different policies for development vs production
4. **Integrate in CI/CD**: Catch violations early by scanning prompt templates in your pipeline
5. **Use SARIF output**: Enable GitHub Code Scanning for visibility into violations

## Troubleshooting

### Common Issues

**No files scanned**: Ensure your prompt files match the default patterns (`*.prompt`, `*.prompt.txt`, `*.prompt.md`, `prompts/**/*.txt`, `SKILL.md`, etc.) or specify custom patterns.

**Policy not found**: Check that `prompt-policy.yml` exists in your project root or specify the path with `--policy`.

**False positives**: Adjust policy severity or add environment overrides to disable specific policies in development.

## Documentation Structure

This skill includes comprehensive documentation:

- **[README.md](./README.md)** - Quick start guide and overview
- **[QUICK-REFERENCE.md](./QUICK-REFERENCE.md)** - Commands, patterns, and troubleshooting at a glance
- **[IMPLEMENTATION.md](./IMPLEMENTATION.md)** - Detailed implementation patterns and advanced usage
- **[TUTORIAL.md](./TUTORIAL.md)** - Step-by-step tutorials for common scenarios
- **[FAQ.md](./FAQ.md)** - Frequently asked questions and answers
- **[POLICY-EXAMPLES.md](./references/POLICY-EXAMPLES.md)** - Policy configuration examples

## Advanced Usage

### Multi-Stage Validation

Validate prompts through multiple policy stages for comprehensive coverage:

```typescript
const piiValidator = await createValidator({ policyPath: './pii-policy.yml' });
const secretsValidator = await createValidator({ policyPath: './secrets-policy.yml' });

let cleanPrompt = userPrompt;

// Stage 1: PII
const piiResult = piiValidator.validate(cleanPrompt);
cleanPrompt = piiResult.redactedPrompt ?? cleanPrompt;

// Stage 2: Secrets
const secretsResult = secretsValidator.validate(cleanPrompt);
if (!secretsResult.allowed) {
  throw new Error('Secrets detected');
}

await sendToLLM(secretsResult.redactedPrompt ?? cleanPrompt);
```

### Environment-Based Configuration

Use different policies per environment:

```typescript
const env = process.env.NODE_ENV || 'development';
const policyMap = {
  development: './policies/dev-policy.yml',
  staging: './policies/staging-policy.yml',
  production: './policies/prod-policy.yml'
};

const validator = await createValidator({
  policyPath: policyMap[env],
  environment: env
});
```

### Batch Validation

Validate multiple prompts efficiently:

```typescript
const validator = await createValidator({ policyPath: './policy.yml' });

const results = prompts.map(prompt => ({
  prompt,
  result: validator.validate(prompt)
}));

const failed = results.filter(r => !r.result.allowed);
console.log(`${failed.length} of ${prompts.length} prompts failed validation`);
```

## Helper Scripts

### Initialize Policy Script

```bash
#!/bin/bash
# scripts/init-policy.sh
./agentskill/promptlint-compliance/scripts/init.sh prompt-policy.yml
```

### Scan Script

```bash
#!/bin/bash
# scripts/scan-prompts.sh
./agentskill/promptlint-compliance/scripts/scan.sh ./prompts prompt-policy.yml
```

Make scripts executable:

```bash
chmod +x agentskill/promptlint-compliance/scripts/*.sh
```

## Real-World Examples

### Example 1: Customer Support Bot

Prevent PII leakage in support conversations:

```yaml
version: 1
policies:
  - id: pii-email-block
    severity: error
    match:
      type: built_in
      detector: email
    actions:
      - type: block
      - type: message
        text: "Please don't include email addresses. Use customer ID instead."

  - id: pii-phone-block
    severity: error
    match:
      type: built_in
      detector: phone
    actions:
      - type: block
      - type: message
        text: "Please don't include phone numbers. Reference ticket number instead."
```

### Example 2: Code Assistant

Prevent secrets in code snippets shared with LLMs:

```yaml
version: 1
policies:
  - id: secrets-all
    severity: error
    match:
      type: built_in
      detector: api_key
    actions:
      - type: block
      - type: message
        text: "Remove API keys. Use environment variables or placeholders."

  - id: aws-credentials
    severity: error
    match:
      type: built_in
      detector: aws_key
    actions:
      - type: block
```

### Example 3: Enterprise LLM Gateway

Block internal references:

```yaml
version: 1
policies:
  - id: internal-domains
    severity: error
    match:
      type: regex
      pattern: "(?:\\.internal\\.|corp\\.|intranet\\.)"
    actions:
      - type: block

  - id: project-codenames
    severity: error
    match:
      type: list
      terms:
        - "Project Aurora"
        - "Operation Phoenix"
      case_sensitive: false
    actions:
      - type: block
```

## Performance Optimization

### Cache Validators

```typescript
const validatorCache = new Map();

async function getValidator(policyPath: string) {
  if (!validatorCache.has(policyPath)) {
    const validator = await createValidator({ policyPath });
    validatorCache.set(policyPath, validator);
  }
  return validatorCache.get(policyPath);
}
```

### Async Validation

```typescript
const results = await Promise.all(
  prompts.map(prompt =>
    validator.validate(prompt)
  )
);
```

## Monitoring and Logging

### Log Violations for Audit

```typescript
const result = validator.validate(prompt);

if (result.violations.length > 0) {
  logger.warn('Prompt violations detected', {
    userId: user.id,
    violations: result.violations.map(v => v.policyId),
    timestamp: new Date().toISOString()
  });
}
```

### Metrics Collection

```typescript
const metrics = {
  totalValidations: 0,
  blocked: 0,
  warned: 0,
  violationsByPolicy: {}
};

const result = validator.validate(prompt);
metrics.totalValidations++;

if (!result.allowed) {
  metrics.blocked++;
}

result.violations.forEach(v => {
  metrics.violationsByPolicy[v.policyId] =
    (metrics.violationsByPolicy[v.policyId] || 0) + 1;
});
```

## References

- [PromptLint GitHub Repository](https://github.com/youcommit/promptlint)
- [Agent Skills Specification](https://agentskills.io/specification)
- [Implementation Guide](./IMPLEMENTATION.md)
- [Tutorial](./TUTORIAL.md)
- [Policy Examples](./references/POLICY-EXAMPLES.md)
