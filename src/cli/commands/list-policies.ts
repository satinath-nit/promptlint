import * as path from 'path';
import chalk from 'chalk';
import { PolicyLoader, findPolicyFile } from '../../core';

interface ListPoliciesOptions {
  policy?: string;
  env?: string;
}

export const listPoliciesCommand = async (options: ListPoliciesOptions): Promise<void> => {
  let policyPath = options.policy;
  
  if (!policyPath) {
    policyPath = findPolicyFile() ?? undefined;
    if (!policyPath) {
      console.error(chalk.red('Error: No policy file found.'));
      console.error(chalk.dim('Specify a policy file path or run from a directory with a policy file'));
      process.exit(1);
    }
  }

  policyPath = path.resolve(policyPath);

  try {
    const loader = new PolicyLoader();
    await loader.loadFromFile(policyPath);
    const policies = loader.getPolicies(options.env);

    console.log(chalk.bold('Active Policies:\n'));

    if (policies.length === 0) {
      console.log(chalk.dim('  No active policies found.'));
      return;
    }

    for (const policy of policies) {
      const severityColor = getSeverityColor(policy.severity);
      const status = policy.enabled === false ? chalk.dim(' (disabled)') : '';
      
      console.log(`  ${chalk.bold(policy.id)}${status}`);
      console.log(`    ${chalk.dim(policy.description)}`);
      console.log(`    Severity: ${severityColor(policy.severity)}`);
      console.log(`    Match: ${policy.match.type}${policy.match.detector ? ` (${policy.match.detector})` : ''}`);
      console.log(`    Actions: ${policy.actions.map((a) => a.type).join(', ')}`);
      console.log();
    }

    console.log(chalk.dim(`Total: ${policies.length} active policies`));
    
    if (options.env) {
      console.log(chalk.dim(`Environment: ${options.env}`));
    }
  } catch (error) {
    console.error(chalk.red(`Error loading policies: ${error}`));
    process.exit(1);
  }
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
