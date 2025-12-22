# PromptLint Agent Skill Tutorial

This tutorial walks through practical scenarios for using PromptLint with AI agents to ensure compliance and security in LLM applications.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Tutorial 1: Basic Prompt Validation](#tutorial-1-basic-prompt-validation)
3. [Tutorial 2: Setting Up CI/CD Compliance](#tutorial-2-setting-up-cicd-compliance)
4. [Tutorial 3: Runtime Integration](#tutorial-3-runtime-integration)
5. [Tutorial 4: Custom Policy Creation](#tutorial-4-custom-policy-creation)
6. [Tutorial 5: Multi-Environment Setup](#tutorial-5-multi-environment-setup)

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Basic understanding of YAML
- Access to an AI agent (Claude Code, Cursor, GitHub Copilot, etc.)

### Installation

Install PromptLint globally:

```bash
npm install -g promptlint
```

Or add to your project:

```bash
npm install --save-dev promptlint
```

Verify installation:

```bash
promptlint --version
```

## Tutorial 1: Basic Prompt Validation

### Scenario

You're building a customer support chatbot and need to ensure user prompts don't contain PII before sending them to an external LLM.

### Step 1: Create Your First Policy

Initialize a policy file:

```bash
mkdir my-chatbot
cd my-chatbot
promptlint init
```

This creates `prompt-policy.yml`:

```yaml
version: 1

policies:
  - id: pii-email
    description: "Detect email addresses in prompts"
    severity: warn
    match:
      type: built_in
      detector: email
    actions:
      - type: annotate
      - type: suggest_redact

  - id: pii-phone
    description: "Detect phone numbers in prompts"
    severity: warn
    match:
      type: built_in
      detector: phone
    actions:
      - type: annotate
      - type: suggest_redact

  - id: secrets-api-key
    description: "Block prompts containing API keys"
    severity: error
    match:
      type: built_in
      detector: api_key
    actions:
      - type: block
```

### Step 2: Create Test Prompts

Create a `prompts` directory with sample prompts:

```bash
mkdir prompts
```

Create `prompts/safe-prompt.txt`:

```
How do I reset my password?
```

Create `prompts/unsafe-prompt.txt`:

```
My email is john.doe@example.com and my phone is 555-123-4567.
Can you help me with my account?
```

### Step 3: Scan Your Prompts

Run the scanner:

```bash
promptlint scan ./prompts
```

Expected output:

```
Scanning 2 files...

✓ prompts/safe-prompt.txt
  └─ No violations found

⚠ prompts/unsafe-prompt.txt
  ├─ pii-email (WARN)
  │  └─ Found: john.doe@example.com at position 12
  │     Suggestion: Redact to [EMAIL_REDACTED]
  ├─ pii-phone (WARN)
  │  └─ Found: 555-123-4567 at position 52
  │     Suggestion: Redact to [PHONE_REDACTED]

Summary: 0 errors, 2 warnings, 2 files scanned
```

### Step 4: Apply Remediation

Update the unsafe prompt by redacting PII:

```
My email is [EMAIL_REDACTED] and my phone is [PHONE_REDACTED].
Can you help me with my account?
```

Scan again to verify:

```bash
promptlint scan ./prompts
```

Now both files should pass!

## Tutorial 2: Setting Up CI/CD Compliance

### Scenario

Ensure all prompt templates in your repository are validated before deployment.

### Step 1: Project Structure

```
my-app/
├── .github/
│   └── workflows/
│       └── promptlint.yml
├── prompts/
│   ├── greeting.prompt
│   ├── customer-service.prompt
│   └── technical-support.prompt
├── prompt-policy.yml
└── package.json
```

### Step 2: Create GitHub Actions Workflow

Create `.github/workflows/promptlint.yml`:

```yaml
name: Prompt Compliance Check

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    name: PromptLint Scan
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install PromptLint
        run: npm install -g promptlint
      
      - name: Validate Policy File
        run: promptlint validate-policy prompt-policy.yml
      
      - name: Scan Prompts
        run: promptlint scan ./prompts --fail-on error
      
      - name: Generate SARIF Report
        if: always()
        run: promptlint scan ./prompts --format sarif > promptlint-results.sarif
        continue-on-error: true
      
      - name: Upload SARIF to GitHub Security
        if: always()
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: promptlint-results.sarif
```

### Step 3: Create Prompt Templates

Create `prompts/greeting.prompt`:

```
Hello! I'm your AI assistant. How can I help you today?
```

Create `prompts/customer-service.prompt`:

```
I understand you need help with your account.
To assist you better, could you describe the issue you're experiencing?
```

### Step 4: Test Locally

Before pushing, test locally:

```bash
# Validate policy
promptlint validate-policy

# Scan prompts
promptlint scan ./prompts --fail-on error

# Generate report
promptlint scan ./prompts --format json > report.json
```

### Step 5: Push and Verify

```bash
git add .
git commit -m "Add prompt compliance checks"
git push
```

Check the Actions tab in GitHub to see the workflow run.

## Tutorial 3: Runtime Integration

### Scenario

Build a chat API that validates user prompts in real-time before sending to an LLM.

### Step 1: Create Express.js Application

```bash
mkdir chat-api
cd chat-api
npm init -y
npm install express promptlint dotenv
npm install --save-dev @types/express @types/node typescript tsx
```

### Step 2: Create Policy File

Create `prompt-policy.yml`:

```yaml
version: 1

policies:
  - id: pii-email
    description: "Block email addresses"
    severity: error
    match:
      type: built_in
      detector: email
    actions:
      - type: block
      - type: message
        text: "Please remove email addresses from your message"

  - id: pii-ssn
    description: "Block Social Security Numbers"
    severity: error
    match:
      type: built_in
      detector: ssn
    actions:
      - type: block
      - type: message
        text: "Please remove Social Security Numbers from your message"

  - id: secrets-api-key
    description: "Block API keys"
    severity: error
    match:
      type: built_in
      detector: api_key
    actions:
      - type: block
      - type: message
        text: "Please remove API keys from your message"
```

### Step 3: Create the API

Create `src/server.ts`:

```typescript
import express from 'express';
import { createValidator } from 'promptlint';

const app = express();
app.use(express.json());

// Initialize validator
let validator: any;

async function initValidator() {
  validator = await createValidator({
    policyPath: './prompt-policy.yml'
  });
  console.log('PromptLint validator initialized');
}

// Validation middleware
function validatePromptMiddleware(req: any, res: any, next: any) {
  const { prompt } = req.body;
  
  if (!prompt) {
    return res.status(400).json({
      error: 'Prompt is required',
      code: 'MISSING_PROMPT'
    });
  }
  
  const result = validator.validate(prompt, {
    source: 'chat_api',
    environment: process.env.NODE_ENV || 'development',
    userId: req.headers['x-user-id']
  });
  
  if (!result.allowed) {
    const violations = result.violations.map((v: any) => ({
      policy: v.policyId,
      message: v.message || v.description,
      severity: v.severity
    }));
    
    return res.status(400).json({
      error: 'Prompt validation failed',
      code: 'POLICY_VIOLATION',
      violations
    });
  }
  
  // Store safe prompt for use in handler
  req.safePrompt = result.redactedPrompt || prompt;
  req.validationWarnings = result.violations.filter((v: any) => v.severity === 'warn');
  
  next();
}

// Chat endpoint
app.post('/api/chat', validatePromptMiddleware, async (req: any, res: any) => {
  try {
    // Simulate LLM call
    const response = await mockLLMCall(req.safePrompt);
    
    res.json({
      success: true,
      response,
      warnings: req.validationWarnings.map((w: any) => ({
        policy: w.policyId,
        message: w.description
      }))
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    validator: validator ? 'initialized' : 'not_initialized'
  });
});

// Mock LLM function
async function mockLLMCall(prompt: string): Promise<string> {
  return `Echo: ${prompt}`;
}

// Start server
const PORT = process.env.PORT || 3000;

initValidator().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
```

### Step 4: Test the API

Create `test-requests.sh`:

```bash
#!/bin/bash

echo "Test 1: Safe prompt"
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is the weather today?"}'

echo -e "\n\nTest 2: Prompt with email (should fail)"
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Contact me at user@example.com"}'

echo -e "\n\nTest 3: Prompt with API key (should fail)"
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Use API key sk_live_1234567890"}'
```

Run tests:

```bash
npm run dev  # In one terminal
chmod +x test-requests.sh
./test-requests.sh  # In another terminal
```

## Tutorial 4: Custom Policy Creation

### Scenario

Create organization-specific policies for internal terms and infrastructure details.

### Step 1: Identify Sensitive Patterns

For your company "Acme Corp", identify:
- Internal hostnames: `*.acme.internal`, `*.corp.acme.com`
- Project codenames: "Project Phoenix", "Operation Lighthouse"
- Internal tool names: "Acme Deploy", "Internal Dashboard"

### Step 2: Create Custom Policy

Create `acme-policy.yml`:

```yaml
version: 1

policies:
  # Standard PII (from template)
  - id: pii-email
    description: "Detect email addresses"
    severity: warn
    match:
      type: built_in
      detector: email
    actions:
      - type: suggest_redact

  # Custom: Block internal hostnames
  - id: acme-internal-hosts
    description: "Block Acme internal hostnames"
    severity: error
    match:
      type: regex
      pattern: "(?:\\bacme\\.internal\\b|corp\\.acme\\.com|intranet\\.acme)"
    actions:
      - type: block
      - type: message
        text: "Internal hostnames detected. Use external domains or remove hostnames."

  # Custom: Block internal IP ranges
  - id: acme-internal-ips
    description: "Block Acme internal IP ranges (10.50.x.x)"
    severity: error
    match:
      type: regex
      pattern: "\\b10\\.50\\.\\d{1,3}\\.\\d{1,3}\\b"
    actions:
      - type: block
      - type: message
        text: "Internal IP addresses detected. Remove or use placeholder IPs."

  # Custom: Block project codenames
  - id: acme-project-codenames
    description: "Block confidential project codenames"
    severity: error
    match:
      type: list
      terms:
        - "Project Phoenix"
        - "Operation Lighthouse"
        - "Titan Initiative"
      case_sensitive: false
    actions:
      - type: block
      - type: message
        text: "Confidential project name detected. Use public project names only."

  # Custom: Block internal tools
  - id: acme-internal-tools
    description: "Block references to internal tools"
    severity: warn
    match:
      type: list
      terms:
        - "Acme Deploy"
        - "Internal Dashboard"
        - "Corp Wiki"
      case_sensitive: false
    actions:
      - type: annotate
      - type: message
        text: "Internal tool mentioned. Consider using generic terms."

  # Custom: Block employee IDs
  - id: acme-employee-ids
    description: "Block Acme employee ID format (EMP-XXXXX)"
    severity: error
    match:
      type: regex
      pattern: "\\bEMP-\\d{5}\\b"
    actions:
      - type: block
      - type: message
        text: "Employee ID detected. Remove before sending to external systems."

# Environment overrides
overrides:
  - env: development
    disable_policies:
      - acme-internal-tools  # Allow in dev
  
  - env: production
    # All policies enforced in production
```

### Step 3: Test Custom Policies

Create test files:

`test-prompts/safe.txt`:
```
How do I configure our public API endpoints for the customer portal?
```

`test-prompts/unsafe-hostname.txt`:
```
Connect to db.acme.internal on port 5432 to query customer data.
```

`test-prompts/unsafe-project.txt`:
```
Project Phoenix launch date is next quarter.
```

`test-prompts/unsafe-employee.txt`:
```
Contact EMP-12345 for access to the system.
```

Run scan:

```bash
promptlint scan test-prompts --policy acme-policy.yml
```

### Step 4: Document Policies

Create `POLICY-GUIDE.md`:

```markdown
# Acme Corp Prompt Policy Guide

## Overview
This policy ensures prompts sent to external LLM services don't contain Acme-specific sensitive information.

## Blocked Content

### Internal Infrastructure
- Internal hostnames (*.acme.internal, corp.acme.com)
- Internal IP ranges (10.50.x.x)
- Employee IDs (EMP-XXXXX)

### Confidential Projects
- Project Phoenix
- Operation Lighthouse
- Titan Initiative

### Internal Tools
⚠️ Warning only in dev, blocked in production:
- Acme Deploy
- Internal Dashboard
- Corp Wiki

## Remediation Examples

❌ Bad: "Query db.acme.internal for user records"
✅ Good: "Query the production database for user records"

❌ Bad: "Project Phoenix metrics show 50% increase"
✅ Good: "Our new initiative metrics show 50% increase"

❌ Bad: "Contact EMP-12345 for approval"
✅ Good: "Contact the team lead for approval"
```

## Tutorial 5: Multi-Environment Setup

### Scenario

Configure different validation rules for development, staging, and production environments.

### Step 1: Create Environment-Specific Policies

Create `policies/base-policy.yml`:

```yaml
version: 1

policies:
  # Always enforced
  - id: secrets-api-key
    description: "Block API keys"
    severity: error
    match:
      type: built_in
      detector: api_key
    actions:
      - type: block

  - id: secrets-aws-key
    description: "Block AWS keys"
    severity: error
    match:
      type: built_in
      detector: aws_key
    actions:
      - type: block

  # PII detection
  - id: pii-ssn
    description: "Block SSN"
    severity: error
    match:
      type: built_in
      detector: ssn
    actions:
      - type: block

  - id: pii-email
    description: "Detect emails"
    severity: warn
    match:
      type: built_in
      detector: email
    actions:
      - type: suggest_redact

  - id: pii-phone
    description: "Detect phone numbers"
    severity: warn
    match:
      type: built_in
      detector: phone
    actions:
      - type: suggest_redact
```

Add environment overrides:

```yaml
# Development: Relaxed rules for testing
overrides:
  - env: development
    disable_policies:
      - pii-email
      - pii-phone

# Staging: Moderate enforcement
overrides:
  - env: staging
    disable_policies:
      - pii-email  # Allow but warn in staging

# Production: Full enforcement
overrides:
  - env: production
    # No policies disabled - everything enforced
```

### Step 2: Create Environment Scripts

Create `scripts/scan-dev.sh`:

```bash
#!/bin/bash
export NODE_ENV=development
promptlint scan ./prompts --policy policies/base-policy.yml --env development
```

Create `scripts/scan-staging.sh`:

```bash
#!/bin/bash
export NODE_ENV=staging
promptlint scan ./prompts --policy policies/base-policy.yml --env staging --fail-on error
```

Create `scripts/scan-prod.sh`:

```bash
#!/bin/bash
export NODE_ENV=production
promptlint scan ./prompts --policy policies/base-policy.yml --env production --fail-on warn
```

### Step 3: Update package.json

```json
{
  "scripts": {
    "lint:dev": "./scripts/scan-dev.sh",
    "lint:staging": "./scripts/scan-staging.sh",
    "lint:prod": "./scripts/scan-prod.sh",
    "lint": "npm run lint:prod"
  }
}
```

### Step 4: CI/CD Integration

Create `.github/workflows/promptlint-multi-env.yml`:

```yaml
name: Multi-Environment Prompt Validation

on:
  push:
    branches: [main, develop, staging]
  pull_request:

jobs:
  development:
    name: Dev Environment Scan
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install -g promptlint
      - run: npm run lint:dev

  staging:
    name: Staging Environment Scan
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/staging'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install -g promptlint
      - run: npm run lint:staging

  production:
    name: Production Environment Scan
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install -g promptlint
      - run: npm run lint:prod
```

## Next Steps

- Explore the [Implementation Guide](./IMPLEMENTATION.md) for advanced patterns
- Review [Policy Examples](./references/POLICY-EXAMPLES.md) for more policy configurations
- Check the main [README](../../../README.md) for complete API documentation

## Additional Resources

- [PromptLint GitHub](https://github.com/youcommit/promptlint)
- [Agent Skills Specification](https://agentskills.io/specification)
- [SARIF Documentation](https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/sarif-support-for-code-scanning)