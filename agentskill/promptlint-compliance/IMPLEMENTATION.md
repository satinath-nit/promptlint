# PromptLint Agent Skill Implementation Guide

This document provides detailed implementation guidance for using the PromptLint Compliance skill in your AI agent workflows.

## Architecture Overview

The PromptLint Agent Skill provides three main capabilities:

1. **Policy Initialization** - Create and configure compliance policies
2. **Prompt Scanning** - Validate prompts against policies
3. **CI/CD Integration** - Automate compliance checks in pipelines

## Installation Methods

### Method 1: Global Installation

Install PromptLint globally for system-wide access:

```bash
npm install -g promptlint
```

This makes the `promptlint` command available everywhere.

### Method 2: Project-Specific Installation

Install as a development dependency:

```bash
npm install --save-dev promptlint
```

Use with `npx`:

```bash
npx promptlint scan .
```

### Method 3: Using the Init Script

The skill includes a helper script for quick setup:

```bash
chmod +x agentskill/promptlint-compliance/scripts/init.sh
./agentskill/promptlint-compliance/scripts/init.sh prompt-policy.yml
```

## Core Workflows

### Workflow 1: Setting Up Compliance Policies

**Step 1: Initialize Policy File**

```bash
promptlint init --output prompt-policy.yml
```

**Step 2: Customize Policies**

Edit `prompt-policy.yml` to add organization-specific rules:

```yaml
version: 1

policies:
  # Standard PII detection
  - id: pii-email
    description: "Detect email addresses"
    severity: warn
    match:
      type: built_in
      detector: email
    actions:
      - type: annotate
      - type: suggest_redact

  # Custom internal hostname detection
  - id: no-internal-hosts
    description: "Block internal hostnames"
    severity: error
    match:
      type: regex
      pattern: "(?:\\.acme\\.internal|\\.corp\\.acme\\.com)"
    actions:
      - type: block
      - type: message
        text: "Remove internal hostnames like '*.acme.internal' before sending prompts"

  # Block confidential project names
  - id: confidential-projects
    description: "Block confidential project codenames"
    severity: error
    match:
      type: list
      terms:
        - "Project Titan"
        - "Operation Lighthouse"
      case_sensitive: false
    actions:
      - type: block
```

**Step 3: Validate Policy**

```bash
promptlint validate-policy prompt-policy.yml
```

### Workflow 2: Scanning Prompts

**Single File Scan**

```bash
promptlint scan examples/user-prompt.txt --policy prompt-policy.yml
```

**Directory Scan**

```bash
promptlint scan ./prompts --policy prompt-policy.yml
```

**Recursive Scan with Custom Patterns**

```bash
# Scans all .prompt files recursively
promptlint scan . --policy prompt-policy.yml
```

**Environment-Specific Scanning**

```bash
# Development environment (some rules disabled)
promptlint scan . --env development

# Production environment (all rules enabled)
promptlint scan . --env production
```

### Workflow 3: Runtime Validation

**Basic Integration**

```typescript
import { createValidator } from 'promptlint';

async function validateAndSendPrompt(userPrompt: string) {
  // Create validator
  const validator = await createValidator({
    policyPath: './prompt-policy.yml'
  });

  // Validate prompt
  const result = validator.validate(userPrompt);

  if (!result.allowed) {
    // Prompt blocked
    console.error('Prompt validation failed:');
    console.error(result.summary);
    
    result.violations.forEach(v => {
      console.error(`- ${v.policyId}: ${v.description}`);
      console.error(`  Match: "${v.match.text}"`);
    });
    
    throw new Error('Prompt contains policy violations');
  }

  // Use redacted version if available
  const safePrompt = result.redactedPrompt ?? userPrompt;
  
  // Send to LLM
  return await sendToLLM(safePrompt);
}
```

**With Context and Metadata**

```typescript
const result = validator.validate(userPrompt, {
  source: 'chat_endpoint',
  userId: 'user-123',
  environment: 'production',
  metadata: {
    sessionId: 'sess-456',
    department: 'engineering'
  }
});
```

**Error Handling**

```typescript
try {
  const validator = await createValidator({
    policyPath: './prompt-policy.yml'
  });
  
  const result = validator.validate(userPrompt);
  
  if (!result.allowed) {
    // Handle violations based on severity
    const errors = result.violations.filter(v => v.severity === 'error');
    const warnings = result.violations.filter(v => v.severity === 'warn');
    
    if (errors.length > 0) {
      // Block the request
      return {
        success: false,
        errors: errors.map(e => e.description)
      };
    }
    
    if (warnings.length > 0) {
      // Log warnings but allow
      console.warn('Prompt warnings:', warnings);
    }
  }
  
  // Proceed with prompt
  return await sendToLLM(result.redactedPrompt ?? userPrompt);
  
} catch (error) {
  console.error('Validation error:', error);
  throw error;
}
```

## Advanced Patterns

### Pattern 1: Multi-Stage Validation

Validate prompts through multiple policy stages:

```typescript
async function multiStageValidation(prompt: string) {
  // Stage 1: PII detection (warn only)
  const piiValidator = await createValidator({
    policyPath: './policies/pii-detection.yml'
  });
  
  const piiResult = piiValidator.validate(prompt);
  let cleanPrompt = piiResult.redactedPrompt ?? prompt;
  
  // Stage 2: Secrets detection (block)
  const secretsValidator = await createValidator({
    policyPath: './policies/secrets-detection.yml'
  });
  
  const secretsResult = secretsValidator.validate(cleanPrompt);
  
  if (!secretsResult.allowed) {
    throw new Error('Prompt contains secrets');
  }
  
  cleanPrompt = secretsResult.redactedPrompt ?? cleanPrompt;
  
  // Stage 3: Custom enterprise policies
  const enterpriseValidator = await createValidator({
    policyPath: './policies/enterprise-rules.yml'
  });
  
  const finalResult = enterpriseValidator.validate(cleanPrompt);
  
  return {
    allowed: finalResult.allowed,
    prompt: finalResult.redactedPrompt ?? cleanPrompt,
    warnings: piiResult.violations,
    violations: finalResult.violations
  };
}
```

### Pattern 2: Conditional Policy Loading

Load different policies based on environment:

```typescript
async function createEnvironmentValidator(env: string) {
  const policyMap = {
    development: './policies/dev-policy.yml',
    staging: './policies/staging-policy.yml',
    production: './policies/prod-policy.yml'
  };
  
  const policyPath = policyMap[env] || policyMap.production;
  
  return createValidator({
    policyPath,
    environment: env
  });
}
```

### Pattern 3: Batch Validation

Validate multiple prompts efficiently:

```typescript
async function batchValidate(prompts: string[]) {
  const validator = await createValidator({
    policyPath: './prompt-policy.yml'
  });
  
  const results = prompts.map(prompt => ({
    prompt,
    result: validator.validate(prompt)
  }));
  
  const failed = results.filter(r => !r.result.allowed);
  const warnings = results.filter(r => 
    r.result.allowed && r.result.violations.length > 0
  );
  
  return {
    total: prompts.length,
    passed: results.length - failed.length,
    failed: failed.length,
    warnings: warnings.length,
    failedPrompts: failed,
    warningPrompts: warnings
  };
}
```

## Output Format Examples

### Text Output

```
Scanning 3 files...

❌ examples/invalid.prompt
  ├─ pii-email (ERROR)
  │  └─ Found: user@company.com at position 45
  │     Message: Email addresses should be redacted
  ├─ secrets-api-key (ERROR)
  │  └─ Found: sk_live_xxxx at position 120
  │     Message: Remove API keys before sending to external LLMs
  
✓ examples/valid.prompt
  └─ No violations found

Summary: 1 error, 0 warnings, 2 files scanned
```

### JSON Output

```json
{
  "summary": {
    "totalFiles": 3,
    "filesWithViolations": 1,
    "totalViolations": 2,
    "errorCount": 2,
    "warnCount": 0
  },
  "results": [
    {
      "file": "examples/invalid.prompt",
      "violations": [
        {
          "policyId": "pii-email",
          "severity": "error",
          "description": "Detect email addresses in prompts",
          "match": {
            "text": "user@company.com",
            "start": 45,
            "end": 61
          },
          "message": "Email addresses should be redacted"
        }
      ]
    }
  ]
}
```

### SARIF Output

SARIF format for GitHub Code Scanning integration:

```json
{
  "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
  "version": "2.1.0",
  "runs": [
    {
      "tool": {
        "driver": {
          "name": "PromptLint",
          "version": "1.0.0"
        }
      },
      "results": [
        {
          "ruleId": "pii-email",
          "level": "error",
          "message": {
            "text": "Email address detected"
          },
          "locations": [
            {
              "physicalLocation": {
                "artifactLocation": {
                  "uri": "examples/invalid.prompt"
                },
                "region": {
                  "startLine": 3,
                  "startColumn": 15
                }
              }
            }
          ]
        }
      ]
    }
  ]
}
```

## Script Usage

### Init Script

```bash
# Basic usage
./agentskill/promptlint-compliance/scripts/init.sh

# Custom output file
./agentskill/promptlint-compliance/scripts/init.sh my-policy.yml

# Force overwrite
./agentskill/promptlint-compliance/scripts/init.sh prompt-policy.yml --force
```

### Scan Script

```bash
# Scan current directory
./agentskill/promptlint-compliance/scripts/scan.sh

# Scan specific path
./agentskill/promptlint-compliance/scripts/scan.sh ./prompts

# Custom policy file
./agentskill/promptlint-compliance/scripts/scan.sh ./prompts my-policy.yml

# JSON output
./agentskill/promptlint-compliance/scripts/scan.sh ./prompts prompt-policy.yml json

# Fail on warnings
./agentskill/promptlint-compliance/scripts/scan.sh ./prompts prompt-policy.yml text warn
```

## Integration Examples

### Express.js Middleware

```typescript
import express from 'express';
import { createValidator } from 'promptlint';

const app = express();
app.use(express.json());

// Initialize validator
let validator;
(async () => {
  validator = await createValidator({
    policyPath: './prompt-policy.yml'
  });
})();

// Middleware
async function validatePrompt(req, res, next) {
  const { prompt } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt required' });
  }
  
  const result = validator.validate(prompt, {
    source: 'api',
    userId: req.user?.id,
    environment: process.env.NODE_ENV
  });
  
  if (!result.allowed) {
    return res.status(400).json({
      error: 'Prompt validation failed',
      violations: result.violations.map(v => ({
        policy: v.policyId,
        message: v.description
      }))
    });
  }
  
  // Store safe prompt
  req.safePrompt = result.redactedPrompt ?? prompt;
  next();
}

// Use middleware
app.post('/api/chat', validatePrompt, async (req, res) => {
  const response = await sendToLLM(req.safePrompt);
  res.json({ response });
});
```

### React Hook

```typescript
import { useState, useEffect } from 'react';

function usePromptValidation(policyUrl: string) {
  const [validator, setValidator] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function init() {
      const response = await fetch(policyUrl);
      const policy = await response.text();
      
      // Note: This is conceptual - browser validation would need WASM or API
      const v = await createValidator({ policy });
      setValidator(v);
      setLoading(false);
    }
    init();
  }, [policyUrl]);
  
  const validate = (prompt: string) => {
    if (!validator) return null;
    return validator.validate(prompt);
  };
  
  return { validate, loading };
}

// Usage in component
function ChatInput() {
  const { validate, loading } = usePromptValidation('/policies/prompt-policy.yml');
  const [prompt, setPrompt] = useState('');
  const [errors, setErrors] = useState([]);
  
  const handleSubmit = async () => {
    const result = validate(prompt);
    
    if (!result.allowed) {
      setErrors(result.violations);
      return;
    }
    
    await sendPrompt(result.redactedPrompt ?? prompt);
  };
  
  return (
    <div>
      <textarea value={prompt} onChange={e => setPrompt(e.target.value)} />
      {errors.map(e => <div key={e.policyId}>{e.description}</div>)}
      <button onClick={handleSubmit} disabled={loading}>Send</button>
    </div>
  );
}
```

## Performance Considerations

### Caching Validators

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
async function validateAsync(prompts: string[]) {
  const validator = await getValidator('./prompt-policy.yml');
  
  return Promise.all(
    prompts.map(prompt => 
      Promise.resolve(validator.validate(prompt))
    )
  );
}
```

## Troubleshooting

### Common Issues

**Issue: "Policy file not found"**
```bash
# Check if file exists
ls -la prompt-policy.yml

# Use absolute path
promptlint scan . --policy $(pwd)/prompt-policy.yml
```

**Issue: "No files scanned"**
```bash
# Check file patterns
promptlint scan . --verbose

# Scan all files
promptlint scan . --pattern "**/*"
```

**Issue: "Validator initialization fails"**
```typescript
try {
  const validator = await createValidator({
    policyPath: './prompt-policy.yml'
  });
} catch (error) {
  console.error('Failed to initialize validator:', error.message);
  // Fallback to permissive mode or fail safely
}
```

## Best Practices

1. **Version Control**: Store policy files in Git alongside code
2. **Environment Separation**: Use different policies for dev/staging/prod
3. **Incremental Rollout**: Start with warnings, then enforce blocks
4. **Regular Updates**: Review and update policies as threats evolve
5. **Performance**: Cache validators, validate asynchronously when possible
6. **Monitoring**: Log violations for audit and improvement
7. **Documentation**: Document custom policies and their rationale

## References

- [PromptLint GitHub Repository](https://github.com/CodeNextGen/promptlint)
- [Agent Skills Specification](https://agentskills.io/specification)
- [Policy Examples](./references/POLICY-EXAMPLES.md)