# PromptLint Policy Examples

This document provides example policies for common compliance scenarios.

## PII Detection Policies

### Email Detection

```yaml
- id: pii-email
  description: "Detect email addresses in prompts"
  severity: warn
  match:
    type: built_in
    detector: email
  actions:
    - type: annotate
    - type: suggest_redact
```

### Phone Number Detection

```yaml
- id: pii-phone
  description: "Detect phone numbers in prompts"
  severity: warn
  match:
    type: built_in
    detector: phone
  actions:
    - type: annotate
    - type: suggest_redact
```

### Social Security Number Detection

```yaml
- id: pii-ssn
  description: "Block prompts containing SSNs"
  severity: error
  match:
    type: built_in
    detector: ssn
  actions:
    - type: block
    - type: message
      text: "SSNs must be removed before sending to external LLMs"
```

### Credit Card Detection

```yaml
- id: pii-credit-card
  description: "Block prompts containing credit card numbers"
  severity: error
  match:
    type: built_in
    detector: credit_card
  actions:
    - type: block
    - type: message
      text: "Credit card numbers must be removed before sending to external LLMs"
```

## Secrets Detection Policies

### API Key Detection

```yaml
- id: secrets-api-key
  description: "Block prompts containing API keys"
  severity: error
  match:
    type: built_in
    detector: api_key
  actions:
    - type: block
    - type: message
      text: "API keys must be removed before sending to external LLMs"
```

### AWS Key Detection

```yaml
- id: secrets-aws-key
  description: "Block prompts containing AWS access keys"
  severity: error
  match:
    type: built_in
    detector: aws_key
  actions:
    - type: block
    - type: message
      text: "AWS keys must be removed before sending to external LLMs"
```

### JWT Token Detection

```yaml
- id: secrets-jwt
  description: "Block prompts containing JWT tokens"
  severity: error
  match:
    type: built_in
    detector: jwt
  actions:
    - type: block
    - type: message
      text: "JWT tokens must be removed before sending to external LLMs"
```

## Custom Pattern Policies

### Internal Hostname Detection

```yaml
- id: no-internal-hostnames
  description: "Block internal hostnames"
  severity: error
  match:
    type: regex
    pattern: "(?:\\.internal\\.|corp\\.|intranet\\.)"
  actions:
    - type: block
    - type: message
      text: "Internal hostnames must be removed before sending to external LLMs"
```

### Internal IP Range Detection

```yaml
- id: no-internal-ips
  description: "Block internal IP addresses"
  severity: error
  match:
    type: regex
    pattern: "(?:10\\.|172\\.(?:1[6-9]|2[0-9]|3[01])\\.|192\\.168\\.)"
  actions:
    - type: block
    - type: message
      text: "Internal IP addresses must be removed before sending to external LLMs"
```

### Restricted Terms

```yaml
- id: restricted-terms
  description: "Block internal project codenames"
  severity: error
  match:
    type: list
    terms:
      - "Project Aurora"
      - "Project Phoenix"
      - "Internal Codename"
      - "Confidential Project"
    case_sensitive: false
  actions:
    - type: block
    - type: message
      text: "Internal project codenames must be removed before sending to external LLMs"
```

## Environment Overrides

You can configure different policies for different environments:

```yaml
overrides:
  - env: development
    disable_policies:
      - pii-email
      - pii-phone
  
  - env: staging
    disable_policies:
      - pii-email
  
  - env: production
    # All policies enabled in production
```

## Complete Example Policy File

```yaml
version: 1

policies:
  # PII Detection
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

  - id: pii-ssn
    description: "Block prompts containing SSNs"
    severity: error
    match:
      type: built_in
      detector: ssn
    actions:
      - type: block

  - id: pii-credit-card
    description: "Block prompts containing credit card numbers"
    severity: error
    match:
      type: built_in
      detector: credit_card
    actions:
      - type: block

  # Secrets Detection
  - id: secrets-api-key
    description: "Block prompts containing API keys"
    severity: error
    match:
      type: built_in
      detector: api_key
    actions:
      - type: block

  - id: secrets-aws-key
    description: "Block prompts containing AWS access keys"
    severity: error
    match:
      type: built_in
      detector: aws_key
    actions:
      - type: block

  - id: secrets-jwt
    description: "Block prompts containing JWT tokens"
    severity: error
    match:
      type: built_in
      detector: jwt
    actions:
      - type: block

  # Custom Patterns
  - id: no-internal-hostnames
    description: "Block internal hostnames"
    severity: error
    match:
      type: regex
      pattern: "(?:\\.internal\\.|corp\\.)"
    actions:
      - type: block

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

overrides:
  - env: development
    disable_policies:
      - pii-email
      - pii-phone
```

## Usage with Agent Skills

When using PromptLint with Agent Skills, you can validate skill content before distribution:

```bash
# Scan a skill directory for policy violations
promptlint scan ./my-skill --policy ./prompt-policy.yml

# Scan all skills in a directory
promptlint scan ./skills --policy ./prompt-policy.yml
```

This ensures that skill instructions don't accidentally contain PII, secrets, or other sensitive information.
