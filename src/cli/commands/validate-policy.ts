import * as path from 'path';
import chalk from 'chalk';
import { PolicyLoader, findPolicyFile } from '../../core';

export const validatePolicyCommand = async (policyPath?: string): Promise<void> => {
  let resolvedPath = policyPath;
  
  if (!resolvedPath) {
    resolvedPath = findPolicyFile() ?? undefined;
    if (!resolvedPath) {
      console.error(chalk.red('Error: No policy file found.'));
      console.error(chalk.dim('Specify a policy file path or run from a directory with a policy file'));
      process.exit(1);
    }
  }

  resolvedPath = path.resolve(resolvedPath);
  console.log(chalk.dim(`Validating: ${resolvedPath}`));
  console.log();

  try {
    const loader = new PolicyLoader();
    const policyFile = await loader.loadFromFile(resolvedPath);
    
    console.log(chalk.green('Policy file is valid!'));
    console.log();
    console.log(`  Version: ${policyFile.version}`);
    console.log(`  Policies: ${policyFile.policies.length}`);
    
    const enabledPolicies = policyFile.policies.filter((p) => p.enabled !== false);
    const disabledPolicies = policyFile.policies.filter((p) => p.enabled === false);
    
    console.log(`    Enabled: ${enabledPolicies.length}`);
    console.log(`    Disabled: ${disabledPolicies.length}`);
    
    if (policyFile.overrides && policyFile.overrides.length > 0) {
      console.log(`  Overrides: ${policyFile.overrides.length} environment(s)`);
    }
  } catch (error) {
    console.error(chalk.red('Policy file validation failed:'));
    console.error(chalk.red(`  ${error}`));
    process.exit(1);
  }
};
