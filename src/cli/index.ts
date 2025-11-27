#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init';
import { scanCommand } from './commands/scan';
import { validatePolicyCommand } from './commands/validate-policy';
import { listPoliciesCommand } from './commands/list-policies';
import { listDetectorsCommand } from './commands/list-detectors';
import { explainCommand } from './commands/explain';

const program = new Command();

program
  .name('promptlint')
  .description('A lightweight, policy-as-code tool for validating LLM prompts against enterprise compliance rules')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize a new prompt-policy.yml file with recommended rules')
  .option('-f, --force', 'Overwrite existing policy file')
  .option('-o, --output <path>', 'Output path for the policy file', 'prompt-policy.yml')
  .action(initCommand);

program
  .command('scan [path]')
  .description('Scan prompt files for policy violations')
  .option('-p, --policy <path>', 'Path to policy file')
  .option('-f, --format <format>', 'Output format (text, json, sarif)', 'text')
  .option('--fail-on <severity>', 'Fail on severity level (error, warn, info)', 'error')
  .option('-v, --verbose', 'Show verbose output')
  .option('-e, --env <environment>', 'Environment for policy overrides')
  .action(scanCommand);

program
  .command('validate-policy [path]')
  .description('Validate the syntax and structure of a policy file')
  .action(validatePolicyCommand);

program
  .command('list-policies')
  .description('List all active policies from the policy file')
  .option('-p, --policy <path>', 'Path to policy file')
  .option('-e, --env <environment>', 'Environment for policy overrides')
  .action(listPoliciesCommand);

program
  .command('list-detectors')
  .description('List all built-in detectors')
  .action(listDetectorsCommand);

program
  .command('explain <policy-id>')
  .description('Explain a policy and provide remediation guidance')
  .option('-p, --policy <path>', 'Path to policy file')
  .action(explainCommand);

program.parse();
