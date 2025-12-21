# PromptLint Quick Reference Card

## Installation

```bash
# Global
npm install -g promptlint

# Project-specific
npm install --save-dev promptlint

# Verify
promptlint --version
```

## Core Commands

| Command | Description | Example |
|---------|-------------|---------|
| `init` | Create policy file | `promptlint init` |
| `scan` | Scan for violations | `promptlint scan .` |
| `validate-policy` | Check policy syntax | `promptlint validate-policy` |
| `list-detectors` | Show built-in detectors | `promptlint list-detectors` |
| `list-policies` | Show active policies | `promptlint list-policies` |
| `explain` | Get policy details | `promptlint explain pii-email` |

## Common Scan Options

```bash
# Custom policy file
promptlint scan . --policy ./my-policy.yml

# Output format
promptlint scan . --format json
promptlint scan . --format sarif

# Fail level
promptlint scan . --fail-on error  # Default
promptlint scan . --fail-on warn   # Stricter

# Environment
promptlint scan . --env production
```

## Built-in Detectors

### PII Detectors
- `email` - Email addresses
- `phone` - US phone numbers
- `ssn` - Social Security Numbers
- `credit_card` - Credit card numbers
- `ipv4` - IPv4 addresses
- `ipv6` - IPv6 addresses

### Secrets Detectors
- `api_key` - Common API keys
- `aws_key` - AWS access keys
- `jwt` - JWT tokens

### Other Detectors
- `url` - URLs

## Policy Structure

```yaml
version: 1

policies:
  - id: unique-id              # Required: Unique identifier
    description: "..."         # Required: What it does
    severity: error            # Required: error, warn, info
    enabled: true              # Optional: default true
    match:                     # Required: How to match
      type: built_in           # or: regex, list
      detector: email          # For built_in type
      # pattern: "regex"       # For regex type
      # terms: [...]           # For list type
    actions:                   # Required: What to do
      - type: block            # or: warn, annotate, etc.
      - type: message
        text: "Custom message"

# Optional environment overrides
overrides:
  - env: development
    disable_policies:
      - pii-email
```

## Match Types

### Built-in Detector
```yaml
match:
  type: built_in
  detector: email
```

### Regex Pattern
```yaml
match:
  type: regex
  pattern: "\\b10\\.50\\.\\d{1,3}\\.\\d{1,3}\\b"
```

### Term List
```yaml
match:
  type: list
  terms:
    - "Project Phoenix"
    - "Internal Tool"
  case_sensitive: false
```

## Action Types

| Action | Effect | Use Case |
|--------|--------|----------|
| `block` | Fail validation | Critical violations |
| `warn` | Log warning | Potential issues |
| `annotate` | Add note | Informational |
| `suggest_redact` | Propose masking | PII redaction |
| `message` | Custom text | Guidance |
| `tag` | Add label | Categorization |

## SDK Usage (TypeScript)

### Basic Validation
```typescript
import { createValidator } from 'promptlint';

const validator = await createValidator({
  policyPath: './prompt-policy.yml'
});

const result = validator.validate(prompt);

if (!result.allowed) {
  console.error(result.summary);
  throw new Error('Validation failed');
}

await sendToLLM(result.redactedPrompt ?? prompt);
```

### With Context
```typescript
const result = validator.validate(prompt, {
  source: 'api',
  userId: 'user-123',
  environment: 'production'
});
```

### Result Structure
```typescript
interface ValidationResult {
  allowed: boolean;
  violations: Violation[];
  summary: string;
  redactedPrompt?: string;
}

interface Violation {
  policyId: string;
  description: string;
  severity: 'error' | 'warn' | 'info';
  match: {
    text: string;
    start: number;
    end: number;
  };
  message?: string;
}
```

## CI/CD Integration

### GitHub Actions
```yaml
- name: Scan Prompts
  run: promptlint scan . --fail-on error
```

### With SARIF
```yaml
- run: promptlint scan . --format sarif > results.sarif
- uses: github/codeql-action/upload-sarif@v2
  with:
    sarif_file: results.sarif
```

### GitLab CI
```yaml
promptlint:
  script:
    - npm install -g promptlint
    - promptlint scan . --fail-on error
```

### Jenkins
```groovy
sh 'npm install -g promptlint'
sh 'promptlint scan . --fail-on error'
```

## File Patterns

### Default Scan Patterns
- `**/*.prompt`
- `**/*.prompt.txt`
- `**/*.prompt.md`
- `**/prompts/**/*.txt`
- `**/prompts/**/*.md`
- `**/SKILL.md`

### Default Exclusions
- `**/node_modules/**`
- `**/dist/**`
- `**/build/**`
- `**/.git/**`

## Environment Overrides

```yaml
overrides:
  # Development: Relaxed
  - env: development
    disable_policies:
      - pii-email
      - pii-phone

  # Staging: Moderate
  - env: staging
    disable_policies:
      - pii-email

  # Production: Strict
  - env: production
    # All policies enforced
```

## Common Patterns

### Block Email Addresses
```yaml
- id: pii-email
  severity: error
  match:
    type: built_in
    detector: email
  actions:
    - type: block
```

### Block Internal Hostnames
```yaml
- id: internal-hosts
  severity: error
  match:
    type: regex
    pattern: "(?:\\.internal\\.|corp\\.)"
  actions:
    - type: block
```

### Block Project Codenames
```yaml
- id: codenames
  severity: error
  match:
    type: list
    terms:
      - "Project Phoenix"
      - "Operation Alpha"
    case_sensitive: false
  actions:
    - type: block
```

### Warn on Phone Numbers
```yaml
- id: pii-phone
  severity: warn
  match:
    type: built_in
    detector: phone
  actions:
    - type: suggest_redact
```

## Troubleshooting Quick Fixes

### "No files scanned"
```bash
# Check if files exist
ls -la prompts/

# Ensure correct file extension
mv prompt.text prompt.txt

# Create prompts directory
mkdir prompts && mv *.txt prompts/
```

### "Policy file not found"
```bash
# Create default policy
promptlint init

# Use absolute path
promptlint scan . --policy $(pwd)/prompt-policy.yml
```

### "Invalid policy syntax"
```bash
# Validate policy
promptlint validate-policy

# Check YAML syntax
yamllint prompt-policy.yml
```

### False Positives
```yaml
# Change severity
severity: warn  # Instead of error

# Disable in dev
overrides:
  - env: development
    disable_policies: [policy-id]
```

## Performance Tips

### Cache Validators
```typescript
const validatorCache = new Map();

function getValidator(path) {
  if (!validatorCache.has(path)) {
    validatorCache.set(path, createValidator({ policyPath: path }));
  }
  return validatorCache.get(path);
}
```

### Batch Validation
```typescript
const results = await Promise.all(
  prompts.map(p => validator.validate(p))
);
```

## Output Formats

### Text (Human-Readable)
```bash
promptlint scan .
```

### JSON (Machine-Readable)
```bash
promptlint scan . --format json > results.json
```

### SARIF (Security Tools)
```bash
promptlint scan . --format sarif > results.sarif
```

## Helper Scripts

### Initialize Policy
```bash
#!/bin/bash
promptlint init --output prompt-policy.yml
```

### Scan with Custom Policy
```bash
#!/bin/bash
PATH_TO_SCAN="${1:-.}"
POLICY="${2:-prompt-policy.yml}"
promptlint scan "$PATH_TO_SCAN" --policy "$POLICY" --fail-on error
```

### Multi-Environment Scan
```bash
#!/bin/bash
ENV="${1:-production}"
promptlint scan . --policy policies/${ENV}-policy.yml --env "$ENV"
```

## Regular Expressions Examples

### Email
```regex
[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}
```

### US Phone
```regex
\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}
```

### Internal IP (10.50.x.x)
```regex
\b10\.50\.\d{1,3}\.\d{1,3}\b
```

### Employee ID (EMP-XXXXX)
```regex
\bEMP-\d{5}\b
```

### API Key Pattern
```regex
sk_live_[a-zA-Z0-9]{24,}
```

## Best Practices Checklist

- [ ] Store policies in version control
- [ ] Start with warnings, gradually enforce
- [ ] Use environment overrides
- [ ] Integrate into CI/CD
- [ ] Regular policy reviews (quarterly)
- [ ] Document custom policies
- [ ] Monitor violation metrics
- [ ] Test policies with sample data
- [ ] Cache validators in production
- [ ] Use SARIF for security dashboards

## Documentation Links

- [Full README](../../../README.md)
- [Agent Skill Overview](./README.md)
- [Implementation Guide](./IMPLEMENTATION.md)
- [Tutorials](./TUTORIAL.md)
- [FAQ](./FAQ.md)
- [Policy Examples](./references/POLICY-EXAMPLES.md)

## Version Info

**PromptLint Version**: 1.0.0  
**Agent Skills Spec**: 1.0  
**Last Updated**: 2024-01-20

---

**Need more help?** See the [FAQ](./FAQ.md) or [Tutorial](./TUTORIAL.md)