# PromptLint Agent Skill - Frequently Asked Questions

## General Questions

### What is PromptLint?

PromptLint is a policy-as-code tool for validating LLM prompts against enterprise compliance rules. It helps organizations safely adopt AI by ensuring prompts don't contain PII, secrets, or other sensitive information before sending them to external AI providers.

### Why use PromptLint instead of a gateway?

PromptLint offers several advantages over traditional API gateway solutions:

- **No infrastructure**: Integrates directly into your codebase
- **Policy-as-code**: Version control your compliance rules
- **Static analysis**: Catch violations at build time, not runtime
- **Developer-friendly**: Works with existing tools (Git, CI/CD, IDEs)
- **No latency**: No additional network hops
- **Cost-effective**: No gateway infrastructure to maintain

### How is this different from DLP solutions?

Traditional DLP (Data Loss Prevention) tools operate at the network or storage layer. PromptLint:

- **Shift-left approach**: Catches violations before deployment
- **Context-aware**: Understands prompt structure and intent
- **Customizable**: Easy to add organization-specific rules
- **Developer-focused**: Integrates into development workflow
- **Lightweight**: No agents or proxies required

## Installation & Setup

### How do I install PromptLint?

**Global installation:**
```bash
npm install -g promptlint
```

**Project-specific:**
```bash
npm install --save-dev promptlint
```

**Verify installation:**
```bash
promptlint --version
```

### What are the system requirements?

- Node.js 18 or higher
- npm or yarn
- Supported OS: Linux, macOS, Windows (WSL2 or native)

### How do I get started quickly?

```bash
# Initialize a policy file
promptlint init

# Scan your prompts
promptlint scan .

# That's it!
```

## Policy Configuration

### What file formats are supported?

PromptLint uses YAML for policy files. The default filename is `prompt-policy.yml`.

### Can I have multiple policy files?

Yes! Use the `--policy` flag to specify different policy files:

```bash
promptlint scan . --policy ./policies/strict-policy.yml
promptlint scan . --policy ./policies/dev-policy.yml
```

### How do I validate my policy file?

```bash
promptlint validate-policy
promptlint validate-policy ./custom-policy.yml
```

### Can I disable specific policies?

Yes, in two ways:

**1. Set `enabled: false` in the policy:**
```yaml
- id: pii-email
  enabled: false
  # ... rest of policy
```

**2. Use environment overrides:**
```yaml
overrides:
  - env: development
    disable_policies:
      - pii-email
      - pii-phone
```

### How do I create custom detectors?

Use regex patterns for custom detection:

```yaml
- id: custom-pattern
  description: "Detect internal employee IDs"
  severity: error
  match:
    type: regex
    pattern: "\\bEMP-\\d{5}\\b"
  actions:
    - type: block
```

Or use term lists:

```yaml
- id: blocked-terms
  description: "Block confidential project names"
  severity: error
  match:
    type: list
    terms:
      - "Project Phoenix"
      - "Operation Lighthouse"
    case_sensitive: false
  actions:
    - type: block
```

## Scanning & Validation

### What files does PromptLint scan by default?

Default patterns:
- `**/*.prompt`
- `**/*.prompt.txt`
- `**/*.prompt.md`
- `**/prompts/**/*.txt`
- `**/prompts/**/*.md`
- `**/SKILL.md` (Agent Skills)

Excluded by default:
- `**/node_modules/**`
- `**/dist/**`
- `**/build/**`
- `**/.git/**`

### How do I scan specific file types?

Use the `--pattern` option (coming in future version) or organize files in a `prompts/` directory.

### Can I scan a single file?

Yes:
```bash
promptlint scan path/to/prompt.txt
```

### What does "fail-on" mean?

The `--fail-on` option determines when the scan exits with a non-zero code:

```bash
promptlint scan . --fail-on error  # Fail only on errors (default)
promptlint scan . --fail-on warn   # Fail on warnings too
promptlint scan . --fail-on info   # Fail on any violation
```

### How do I get machine-readable output?

Use the `--format` option:

```bash
promptlint scan . --format json > results.json
promptlint scan . --format sarif > results.sarif
```

## Built-in Detectors

### What PII does PromptLint detect?

- **email**: Email addresses
- **phone**: US phone numbers
- **ssn**: Social Security Numbers
- **credit_card**: Credit card numbers
- **ipv4**: IPv4 addresses
- **ipv6**: IPv6 addresses

### What secrets does it detect?

- **api_key**: Common API key patterns
- **aws_key**: AWS access keys (AKIA...)
- **jwt**: JWT tokens

### Are international formats supported?

Currently, built-in detectors focus on US formats. For international support:

1. Use custom regex patterns
2. Create region-specific policies
3. Contribute detectors to the project!

Example for UK phone numbers:
```yaml
- id: uk-phone
  match:
    type: regex
    pattern: "\\+44\\s?\\d{10}|0\\d{10}"
```

### How accurate are the detectors?

Built-in detectors use industry-standard regex patterns with high precision. However:

- **False positives**: Some patterns may match non-sensitive data
- **False negatives**: Complex formats may be missed
- **Recommendation**: Test with your data and adjust policies

## Runtime Integration

### Can I use PromptLint in my application?

Yes! Use the TypeScript/JavaScript SDK:

```typescript
import { createValidator } from 'promptlint';

const validator = await createValidator({
  policyPath: './prompt-policy.yml'
});

const result = validator.validate(userPrompt);

if (!result.allowed) {
  // Handle violation
}
```

### How do I handle validation results?

```typescript
interface ValidationResult {
  allowed: boolean;           // Overall pass/fail
  violations: Violation[];    // List of violations
  summary: string;            // Human-readable summary
  redactedPrompt?: string;    // Prompt with PII redacted
}
```

### What's the performance impact?

PromptLint is designed to be lightweight:

- **Validation**: < 10ms for typical prompts
- **Initialization**: < 100ms to load policy
- **Memory**: < 50MB for typical usage

**Optimization tips:**
- Cache validators across requests
- Use async validation for batches
- Consider lazy loading for large policy files

### Can I use it with other languages?

Currently, native support is for TypeScript/JavaScript. For other languages:

- Use CLI via subprocess
- Wait for upcoming SDKs (Python, Java, Go)
- Contribute a language binding!

## CI/CD Integration

### How do I integrate with GitHub Actions?

```yaml
name: Prompt Lint
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install -g promptlint
      - run: promptlint scan . --fail-on error
```

### How do I use SARIF with GitHub Code Scanning?

```yaml
- name: Run PromptLint
  run: promptlint scan . --format sarif > results.sarif
  continue-on-error: true

- name: Upload SARIF
  uses: github/codeql-action/upload-sarif@v2
  with:
    sarif_file: results.sarif
```

### Can I use it with GitLab CI?

```yaml
promptlint:
  stage: test
  script:
    - npm install -g promptlint
    - promptlint scan . --fail-on error
```

### What about Jenkins?

```groovy
stage('PromptLint') {
  steps {
    sh 'npm install -g promptlint'
    sh 'promptlint scan . --fail-on error'
  }
}
```

## Environment & Deployment

### How do I use different policies per environment?

**Option 1: Environment overrides in policy file:**
```yaml
overrides:
  - env: development
    disable_policies: [pii-email]
  - env: production
    # All policies enabled
```

**Option 2: Separate policy files:**
```bash
promptlint scan . --policy ./policies/dev-policy.yml --env development
promptlint scan . --policy ./policies/prod-policy.yml --env production
```

### How do I set the environment?

```bash
# Via flag
promptlint scan . --env production

# Via environment variable
export NODE_ENV=production
promptlint scan .
```

### Can I use environment variables in policies?

Not directly in the YAML, but you can:

1. Generate policy files programmatically
2. Use environment overrides
3. Template policy files with a build step

## Troubleshooting

### "No files scanned" - Why?

**Possible reasons:**
1. Files don't match default patterns
2. Files are in excluded directories
3. No prompt files in scan path

**Solutions:**
- Check file extensions (`.prompt`, `.txt`, `.md`)
- Move files to `prompts/` directory
- Verify not in `node_modules/`, `dist/`, etc.

### "Policy file not found" - What now?

**Solutions:**
1. Ensure file exists: `ls -la prompt-policy.yml`
2. Use absolute path: `--policy $(pwd)/prompt-policy.yml`
3. Create default: `promptlint init`

### Why am I getting false positives?

**Common causes:**
1. Regex too broad
2. Example data in prompts
3. Test fixtures

**Solutions:**
1. Refine regex patterns
2. Use `enabled: false` for development
3. Add file exclusions
4. Adjust severity to `warn` instead of `error`

### How do I debug policy issues?

```bash
# Validate policy syntax
promptlint validate-policy

# Run with verbose output (if available)
promptlint scan . --verbose

# Test specific detector
promptlint explain pii-email
```

### Performance is slow - How to optimize?

**Optimization strategies:**

1. **Cache validators:**
```typescript
const validator = await getOrCreateValidator(policyPath);
```

2. **Batch validation:**
```typescript
const results = await Promise.all(prompts.map(p => validate(p)));
```

3. **Lazy load policies:**
```typescript
let validator;
async function getValidator() {
  if (!validator) validator = await createValidator({...});
  return validator;
}
```

## Agent Skills

### What is an Agent Skill?

A modular capability that can be loaded by AI coding agents (Claude Code, Cursor, GitHub Copilot) to perform specific tasks.

### How do I install this skill for my agent?

**Claude Code:**
```bash
cp -r agentskill/promptlint-compliance ~/.claude/skills/
```

**Cursor:**
```bash
cp -r agentskill/promptlint-compliance .cursor/skills/
```

**VS Code:**
```bash
cp -r agentskill/promptlint-compliance .github/skills/
```

### What can the agent do with this skill?

- Initialize compliance policies
- Scan prompts for violations
- Generate compliance reports
- Set up CI/CD integration
- Create custom policies
- Explain policy violations

## Best Practices

### What's the recommended rollout strategy?

**Phase 1: Awareness (Week 1-2)**
- Deploy with `severity: warn` for all policies
- Monitor violations
- Educate team

**Phase 2: Soft Enforcement (Week 3-4)**
- Block secrets and critical PII (`severity: error`)
- Keep other rules as warnings
- Gather feedback

**Phase 3: Full Enforcement (Week 5+)**
- Enforce all policies
- Integrate into CI/CD
- Regular policy reviews

### How often should I update policies?

**Recommended schedule:**
- **Weekly**: Review violation logs
- **Monthly**: Update patterns based on new threats
- **Quarterly**: Full policy audit
- **Ad-hoc**: When new sensitive data types emerge

### Should I commit policy files to Git?

**Yes!** Benefits:
- Version control compliance rules
- Peer review policy changes
- Track policy evolution
- Enable GitOps workflows

### How do I handle legacy prompts?

**Strategies:**

1. **Gradual migration:**
```yaml
overrides:
  - env: legacy
    disable_policies: [pii-email, pii-phone]
```

2. **File-specific rules:**
- Organize legacy prompts separately
- Apply different policies per directory

3. **Incremental cleanup:**
- Fix violations in batches
- Track progress with metrics

## Advanced Topics

### Can I extend PromptLint with plugins?

Not yet, but it's on the roadmap! For now:
- Use custom regex patterns
- Combine with other tools
- Contribute to the core project

### How do I integrate with logging systems?

```typescript
const result = validator.validate(prompt);

if (result.violations.length > 0) {
  logger.warn('Prompt violations', {
    violations: result.violations.map(v => ({
      policy: v.policyId,
      severity: v.severity
    })),
    user: userId,
    timestamp: new Date()
  });
}
```

### Can I build a dashboard for violations?

Yes! Use JSON output:

```bash
promptlint scan . --format json | your-dashboard-tool
```

Or store results in a database:

```typescript
const result = validator.validate(prompt);
await db.violations.insert({
  userId,
  violations: result.violations,
  timestamp: new Date()
});
```

### How do I contribute to PromptLint?

1. Fork the repository
2. Create a feature branch
3. Add detectors, docs, or tests
4. Submit a pull request

**Areas needing help:**
- Additional language detectors
- IDE integrations
- Policy packs for industries
- Documentation improvements

## Support & Resources

### Where can I get help?

- **Documentation**: [Implementation Guide](./IMPLEMENTATION.md), [Tutorial](./TUTORIAL.md)
- **GitHub Issues**: [Report bugs or request features](https://github.com/youcommit/promptlint/issues)
- **Discussions**: [Ask questions](https://github.com/youcommit/promptlint/discussions)

### How do I report a bug?

Open an issue with:
- PromptLint version
- Node.js version
- Policy file (if applicable)
- Steps to reproduce
- Expected vs actual behavior

### How do I request a feature?

Open a GitHub issue with:
- Use case description
- Proposed solution
- Example configuration
- Benefits to users

### Is there a community?

Join the discussion:
- GitHub Discussions
- Tag us on Twitter/X
- Contribute to the project

## License & Legal

### What license is PromptLint under?

Apache License 2.0 - permissive open source license.

### Can I use it in commercial projects?

Yes! Apache 2.0 allows commercial use.

### Do I need to attribute?

Attribution is appreciated but not required for Apache 2.0.

### Is there enterprise support?

Community support via GitHub. Enterprise support options coming soon.

---

**Didn't find your answer?** Open an issue or discussion on [GitHub](https://github.com/youcommit/promptlint).