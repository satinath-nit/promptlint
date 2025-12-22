# PromptLint Compliance Agent Skill

This directory contains the Agent Skill implementation for PromptLint, enabling AI agents to validate LLM prompts against enterprise compliance policies.

## What is an Agent Skill?

Agent Skills are modular capabilities that can be integrated into AI coding agents (like Claude Code, Cursor, GitHub Copilot, etc.). They teach agents how to perform specific tasks by providing structured documentation, scripts, and examples.

## What Does This Skill Do?

The PromptLint Compliance skill enables AI agents to:

1. **Validate Prompts for PII**: Detect emails, phone numbers, SSNs, credit cards
2. **Detect Secrets**: Find API keys, AWS credentials, JWT tokens
3. **Enforce Custom Policies**: Block internal hostnames, project codenames, restricted terms
4. **Generate Compliance Reports**: Output in text, JSON, or SARIF format
5. **Integrate with CI/CD**: Set up automated validation in GitHub Actions, GitLab CI, etc.

## Directory Structure

```
agentskill/promptlint-compliance/
├── README.md                    # This file
├── SKILL.md                     # Agent Skill specification (main entry point)
├── IMPLEMENTATION.md            # Detailed implementation guide
├── TUTORIAL.md                  # Step-by-step tutorials
├── references/
│   └── POLICY-EXAMPLES.md       # Policy configuration examples
└── scripts/
    ├── init.sh                  # Initialize policy file
    └── scan.sh                  # Scan prompts for violations
```

## Quick Start

### For AI Agents

Copy this directory to your agent's skills folder:

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

### For Developers

Install PromptLint:

```bash
npm install -g promptlint
```

Initialize a policy:

```bash
promptlint init
```

Scan your prompts:

```bash
promptlint scan .
```

## Documentation

### Core Documents

1. **[SKILL.md](./SKILL.md)** - Main skill specification
   - Overview and when to use this skill
   - Installation instructions
   - Core commands and usage
   - Quick reference for AI agents

2. **[QUICK-REFERENCE.md](./QUICK-REFERENCE.md)** - Quick reference card
   - All commands at a glance
   - Common patterns and examples
   - Troubleshooting quick fixes
   - Performance tips

3. **[IMPLEMENTATION.md](./IMPLEMENTATION.md)** - Implementation guide
   - Architecture overview
   - Advanced usage patterns
   - Performance optimization
   - Troubleshooting guide

4. **[TUTORIAL.md](./TUTORIAL.md)** - Step-by-step tutorials
   - Tutorial 1: Basic prompt validation
   - Tutorial 2: CI/CD integration
   - Tutorial 3: Runtime API integration
   - Tutorial 4: Custom policy creation
   - Tutorial 5: Multi-environment setup

5. **[FAQ.md](./FAQ.md)** - Frequently asked questions
   - General questions
   - Installation and setup
   - Policy configuration
   - Troubleshooting

6. **[POLICY-EXAMPLES.md](./references/POLICY-EXAMPLES.md)** - Policy examples
   - PII detection policies
   - Secrets detection policies
   - Custom pattern policies
   - Complete example configurations

### Helper Scripts

- **[init.sh](./scripts/init.sh)** - Initialize policy with recommended rules
- **[scan.sh](./scripts/scan.sh)** - Scan prompts for violations

## Usage Examples

### Example 1: Validate a Prompt Before Sending to LLM

```typescript
import { createValidator } from 'promptlint';

const validator = await createValidator({
  policyPath: './prompt-policy.yml'
});

const result = validator.validate(userPrompt);

if (!result.allowed) {
  console.error('Blocked:', result.summary);
} else {
  await sendToLLM(result.redactedPrompt ?? userPrompt);
}
```

### Example 2: Scan Prompt Templates in CI

```yaml
# .github/workflows/promptlint.yml
- name: Scan Prompts
  run: promptlint scan ./prompts --fail-on error
```

### Example 3: Custom Enterprise Policy

```yaml
# prompt-policy.yml
policies:
  - id: no-internal-hosts
    severity: error
    match:
      type: regex
      pattern: "(?:\\.internal\\.|corp\\.)"
    actions:
      - type: block
```

## Common Use Cases

### Use Case 1: Customer Support Chatbot

Ensure customer messages don't contain PII before sending to external LLM:

```yaml
policies:
  - id: pii-email
    severity: error
    match:
      type: built_in
      detector: email
    actions:
      - type: block
```

### Use Case 2: Code Assistant

Prevent developers from accidentally including secrets in prompts:

```yaml
policies:
  - id: secrets-api-key
    severity: error
    match:
      type: built_in
      detector: api_key
    actions:
      - type: block
```

### Use Case 3: Enterprise LLM Gateway

Block internal project names from reaching external providers:

```yaml
policies:
  - id: confidential-projects
    severity: error
    match:
      type: list
      terms:
        - "Project Phoenix"
        - "Operation Lighthouse"
    actions:
      - type: block
```

## Agent Skill Capabilities

When an AI agent loads this skill, it gains the ability to:

### 1. Initialize Compliance Policies

```plaintext
Agent: "I'll set up a prompt policy for your project"
→ Runs: promptlint init
→ Creates: prompt-policy.yml with recommended rules
```

### 2. Validate Prompts

```plaintext
Agent: "Let me check if this prompt is safe to send"
→ Runs: promptlint scan [file]
→ Reports: Violations found (PII, secrets, etc.)
```

### 3. Generate Compliance Reports

```plaintext
Agent: "I'll generate a SARIF report for GitHub Code Scanning"
→ Runs: promptlint scan . --format sarif
→ Creates: SARIF file for security dashboard
```

### 4. Set Up CI/CD Integration

```plaintext
Agent: "I'll add prompt validation to your GitHub Actions"
→ Creates: .github/workflows/promptlint.yml
→ Configures: Automated scanning on pull requests
```

### 5. Create Custom Policies

```plaintext
Agent: "I'll create a policy to block your internal domains"
→ Analyzes: Project requirements
→ Generates: Custom regex patterns
→ Updates: prompt-policy.yml
```

## Integration Points

### With Development Workflow

```mermaid
graph LR
    A[Write Prompt] --> B[Save File]
    B --> C[Agent Scans]
    C --> D{Violations?}
    D -->|Yes| E[Show Errors]
    D -->|No| F[Commit Code]
    E --> A
    F --> G[CI Pipeline]
    G --> H[PromptLint Scan]
```

### With CI/CD Pipeline

```
1. Developer pushes code with prompt templates
2. CI runs: promptlint scan ./prompts
3. PromptLint checks against policies
4. If violations: build fails, report generated
5. If clean: build continues
```

### With Runtime Applications

```
1. User submits prompt to API
2. API validates with PromptLint SDK
3. If violations: return error to user
4. If clean: send to LLM provider
5. Return LLM response
```

## Built-in Detectors

| Detector | Detects | Example |
|----------|---------|---------|
| `email` | Email addresses | `user@example.com` |
| `phone` | US phone numbers | `555-123-4567` |
| `ssn` | Social Security Numbers | `123-45-6789` |
| `credit_card` | Credit card numbers | `4532-1234-5678-9010` |
| `ipv4` | IPv4 addresses | `192.168.1.1` |
| `ipv6` | IPv6 addresses | `2001:db8::1` |
| `url` | URLs | `https://example.com` |
| `api_key` | API keys | `sk_live_abc123` |
| `aws_key` | AWS access keys | `AKIAIOSFODNN7EXAMPLE` |
| `jwt` | JWT tokens | `eyJhbGc...` |

## Policy Actions

| Action | Effect | Use When |
|--------|--------|----------|
| `block` | Fail validation | Critical violations (secrets, SSN) |
| `warn` | Log warning | Potential issues (emails, phones) |
| `annotate` | Add note | Informational alerts |
| `suggest_redact` | Propose redaction | PII that can be masked |
| `message` | Custom message | Provide remediation guidance |

## Environment Support

### Supported Platforms

- ✅ Linux (Ubuntu, Debian, RHEL, etc.)
- ✅ macOS (Intel and Apple Silicon)
- ✅ Windows (WSL2 and native)

### Supported CI/CD

- ✅ GitHub Actions
- ✅ GitLab CI
- ✅ Jenkins
- ✅ CircleCI
- ✅ Azure DevOps

### Supported Languages

- ✅ TypeScript/JavaScript (native)
- 🔄 Python (coming soon)
- 🔄 Java (coming soon)
- 🔄 Go (coming soon)

## Best Practices

### 1. Start Conservative

Begin with warnings, then gradually enforce blocks:

```yaml
# Week 1: Warn only
severity: warn

# Week 2: Block after team review
severity: error
```

### 2. Use Environment Overrides

Different rules for different environments:

```yaml
overrides:
  - env: development
    disable_policies: [pii-email]
  - env: production
    # All policies enforced
```

### 3. Version Control Policies

Store policies in Git:

```bash
git add prompt-policy.yml
git commit -m "feat: add email detection policy"
```

### 4. Regular Policy Reviews

Schedule quarterly reviews:

```bash
# Add to calendar: Review prompt policies
# Check for: New threats, false positives, coverage gaps
```

### 5. Document Custom Policies

Add comments explaining complex patterns:

```yaml
policies:
  - id: internal-ips
    # Matches Acme Corp internal IP range (10.50.x.x)
    # Added: 2024-01-15
    # Owner: Security Team
    match:
      type: regex
      pattern: "\\b10\\.50\\.\\d{1,3}\\.\\d{1,3}\\b"
```

## Troubleshooting

### Common Issues

**"No files scanned"**
- Check file patterns match your files
- Use `--pattern` to specify custom patterns
- Verify files aren't in excluded directories

**"Policy file not found"**
- Ensure `prompt-policy.yml` exists
- Use `--policy` to specify custom path
- Run `promptlint init` to create default policy

**"Validator initialization fails"**
- Check YAML syntax: `promptlint validate-policy`
- Verify file permissions
- Check for circular references

### Getting Help

- 📚 [Full Documentation](https://github.com/youcommit/promptlint)
- 🐛 [Report Issues](https://github.com/youcommit/promptlint/issues)
- 💬 [Discussions](https://github.com/youcommit/promptlint/discussions)

## Contributing

Contributions welcome! Areas where you can help:

- 🌍 Additional language detectors (EU PII, GDPR compliance)
- 📦 Pre-built policy packs (healthcare, finance, etc.)
- 🔌 New integrations (IDEs, CI platforms)
- 📖 Documentation improvements
- 🧪 Test coverage

## License

Apache License 2.0 - See [LICENSE](../../../LICENSE) for details.

## Version

**Current Version**: 1.0.0  
**Last Updated**: 2024-01-20  
**Agent Skills Spec**: 1.0

## Related Resources

- [PromptLint Repository](https://github.com/youcommit/promptlint)
- [Agent Skills Specification](https://agentskills.io/specification)
- [OWASP LLM Top 10](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [NIST AI Risk Management](https://www.nist.gov/itl/ai-risk-management-framework)