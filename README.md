# PromptLint

A lightweight, policy-as-code tool for validating LLM prompts against enterprise compliance rules.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue.svg)](https://www.typescriptlang.org/)

## Overview

PromptLint helps enterprises safely adopt LLMs by validating prompts against configurable policies before they're sent to AI providers. Unlike gateway-based solutions, PromptLint integrates directly into your codebase and CI/CD pipeline.

**Key Features:**
- **Policy-as-Code**: Define validation rules in YAML, version in Git, review like any code change
- **Static Scanning**: Scan prompt templates in CI before deployment
- **Runtime Validation**: Lightweight SDK to validate prompts before sending to LLMs
- **Built-in Detectors**: PII detection (email, phone, SSN, credit cards), secrets, and more
- **No Gateway Required**: Integrates directly into your apps - no proxy architecture needed

## Installation

```bash
npm install promptlint
```

Or install globally for CLI usage:

```bash
npm install -g promptlint
```

## Quick Start

### 1. Initialize a Policy File

```bash
promptlint init
```

This creates a `prompt-policy.yml` file with recommended rules.

### 2. Scan Your Prompts

```bash
promptlint scan .
```

### 3. Integrate in CI

Add to your GitHub Actions workflow:

```yaml
- name: Run PromptLint
  run: npx promptlint scan . --fail-on error
```

## CLI Commands

### `promptlint init`

Create a starter policy file with recommended rules.

```bash
promptlint init
promptlint init --output custom-policy.yml
promptlint init --force  # Overwrite existing
```

### `promptlint scan [path]`

Scan prompt files for policy violations.

```bash
promptlint scan .
promptlint scan ./prompts --policy ./my-policy.yml
promptlint scan . --format json
promptlint scan . --format sarif  # For GitHub Code Scanning
promptlint scan . --fail-on warn  # Fail on warnings too
promptlint scan . --env production  # Use environment overrides
```

### `promptlint validate-policy [path]`

Validate the syntax and structure of a policy file.

```bash
promptlint validate-policy
promptlint validate-policy ./custom-policy.yml
```

### `promptlint list-policies`

List all active policies from the policy file.

```bash
promptlint list-policies
promptlint list-policies --policy ./custom-policy.yml
promptlint list-policies --env production
```

### `promptlint list-detectors`

List all built-in detectors.

```bash
promptlint list-detectors
```

### `promptlint explain <policy-id>`

Get detailed explanation and remediation guidance for a policy.

```bash
promptlint explain pii-email
promptlint explain secrets-api-key
```

## Policy Configuration

Policies are defined in YAML format:

```yaml
version: 1

policies:
  # Block internal hostnames
  - id: no-internal-hostnames
    description: "Prompts must not include internal hostnames"
    severity: error
    match:
      type: regex
      pattern: "(?:\\.internal\\.|corp\\.)"
    actions:
      - type: block
      - type: message
        text: "Remove internal hostnames before sending to external LLMs"

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

# Environment-specific overrides
overrides:
  - env: development
    disable_policies:
      - pii-email
```

### Policy Fields

| Field | Description | Required |
|-------|-------------|----------|
| `id` | Unique identifier for the policy | Yes |
| `description` | Human-readable description | Yes |
| `severity` | `error`, `warn`, or `info` | Yes |
| `match.type` | `regex`, `built_in`, or `list` | Yes |
| `match.pattern` | Regex pattern (for `regex` type) | Conditional |
| `match.detector` | Built-in detector name (for `built_in` type) | Conditional |
| `match.terms` | List of terms (for `list` type) | Conditional |
| `actions` | Array of actions to take on match | Yes |
| `enabled` | Enable/disable the policy (default: true) | No |
| `applies_to` | Scope restrictions (contexts, files) | No |

### Built-in Detectors

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

### Action Types

| Action | Description |
|--------|-------------|
| `block` | Block the prompt (causes validation to fail) |
| `warn` | Log a warning |
| `annotate` | Add annotation to output |
| `suggest_redact` | Suggest redacting the matched content |
| `message` | Display a custom message |
| `tag` | Add a tag to the violation |

## SDK Usage

### TypeScript/JavaScript

```typescript
import { createValidator } from 'promptlint';

// Create validator from policy file
const validator = await createValidator({
  policyPath: './prompt-policy.yml'
});

// Validate a prompt
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

### With Context

```typescript
const result = validator.validate(prompt, {
  source: 'chat_endpoint',
  userId: 'user-123',
  environment: 'production'
});
```

### Validation Result

```typescript
interface ValidationResult {
  allowed: boolean;           // Whether the prompt passed validation
  violations: Violation[];    // List of policy violations
  summary: string;            // Human-readable summary
  redactedPrompt?: string;    // Prompt with sensitive data redacted
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
  actions: ActionConfig[];
  message?: string;
}
```

## CI/CD Integration

### GitHub Actions

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

### With SARIF Output (GitHub Code Scanning)

```yaml
- name: Run PromptLint
  run: promptlint scan . --format sarif > promptlint-results.sarif
  continue-on-error: true

- name: Upload SARIF
  uses: github/codeql-action/upload-sarif@v2
  with:
    sarif_file: promptlint-results.sarif
```

## File Patterns

By default, PromptLint scans files matching these patterns:
- `**/*.prompt`
- `**/*.prompt.txt`
- `**/*.prompt.md`
- `**/prompts/**/*.txt`
- `**/prompts/**/*.md`
- `**/prompts/**/*.yaml`
- `**/prompts/**/*.yml`
- `**/SKILL.md` (Agent Skills)

Excluded by default:
- `**/node_modules/**`
- `**/dist/**`
- `**/build/**`
- `**/.git/**`

## Output Formats

### Text (default)

Human-readable output with colors and formatting.

### JSON

```bash
promptlint scan . --format json
```

Machine-readable JSON output for integration with other tools.

### SARIF

```bash
promptlint scan . --format sarif
```

Static Analysis Results Interchange Format for GitHub Code Scanning and other security tools.

## Contributing

Contributions are welcome! Here are some ways you can contribute:

- **New Detectors**: Add detection for region-specific PII, industry terms, etc.
- **Policy Packs**: Create pre-built policy sets for different industries
- **Integrations**: Add support for more CI platforms, IDEs, etc.
- **Documentation**: Improve docs, add examples, write tutorials

### Development Setup

```bash
git clone https://github.com/CodeNextGen/promptlint.git
cd promptlint
npm install
npm run build
npm run cli -- scan ./examples
```

## Agent Skills Integration

PromptLint includes a comprehensive [Agent Skill](https://agentskills.io) that enables AI agents (like Claude Code, Cursor, GitHub Copilot, etc.) to use PromptLint for compliance checking.

### 📁 Agent Skill Documentation

The skill is located in [`agentskill/promptlint-compliance/`](./agentskill/promptlint-compliance/) and includes:

- **[README.md](./agentskill/promptlint-compliance/README.md)** - Quick start and overview
- **[SKILL.md](./agentskill/promptlint-compliance/SKILL.md)** - Main skill specification
- **[IMPLEMENTATION.md](./agentskill/promptlint-compliance/IMPLEMENTATION.md)** - Advanced patterns and integration
- **[TUTORIAL.md](./agentskill/promptlint-compliance/TUTORIAL.md)** - Step-by-step tutorials
- **[FAQ.md](./agentskill/promptlint-compliance/FAQ.md)** - Frequently asked questions
- **[POLICY-EXAMPLES.md](./agentskill/promptlint-compliance/references/POLICY-EXAMPLES.md)** - Policy configurations

### 🚀 Installing the Skill

Copy the skill directory to your agent's skills folder:

**Claude Code:**
```bash
cp -r agentskill/promptlint-compliance ~/.claude/skills/
```

**Cursor:**
```bash
cp -r agentskill/promptlint-compliance .cursor/skills/
```

**VS Code / GitHub Copilot:**
```bash
cp -r agentskill/promptlint-compliance .github/skills/
```

### 🤖 Agent Capabilities

Once installed, AI agents can:

- ✅ **Initialize compliance policies** - Create policy files with recommended rules
- ✅ **Validate prompts** - Scan for PII, secrets, and policy violations
- ✅ **Generate reports** - Output in text, JSON, or SARIF format
- ✅ **Set up CI/CD** - Automate validation in GitHub Actions, GitLab CI, etc.
- ✅ **Create custom policies** - Build organization-specific rules
- ✅ **Explain violations** - Provide remediation guidance

### 📖 Learn More

- [Quick Start Guide](./agentskill/promptlint-compliance/README.md)
- [Implementation Patterns](./agentskill/promptlint-compliance/IMPLEMENTATION.md)
- [Step-by-Step Tutorials](./agentskill/promptlint-compliance/TUTORIAL.md)
- [Agent Skills Specification](https://agentskills.io/specification)

## Roadmap/ Future Scope

- [ ] VS Code extension
- [ ] IntelliJ plugin
- [ ] Python SDK
- [ ] Java SDK
- [ ] LLM-assisted detection mode
- [ ] Web dashboard for scan reports
- [ ] Policy library repository
- [x] Agent Skills integration

## License

Apache License 2.0 - see [LICENSE](LICENSE) for details.

## Author

**CodeNextGen** - [GitHub](https://github.com/CodeNextGen)
