import * as path from 'path';
import chalk from 'chalk';
import { scanPrompts, shouldFailBuild, findPolicyFile } from '../../core';
import { formatOutput } from '../../utils/formatter';
import { OutputFormat, Severity } from '../../types';

interface ScanOptions {
  policy?: string;
  format?: string;
  failOn?: string;
  verbose?: boolean;
  env?: string;
}

export const scanCommand = async (targetPath: string = '.', options: ScanOptions): Promise<void> => {
  const resolvedPath = path.resolve(targetPath);
  
  let policyPath = options.policy;
  if (!policyPath) {
    policyPath = findPolicyFile(resolvedPath) ?? undefined;
    if (!policyPath) {
      console.error(chalk.red('Error: No policy file found.'));
      console.error(chalk.dim('Run "promptlint init" to create a policy file, or specify one with --policy'));
      process.exit(1);
    }
    if (options.verbose) {
      console.log(chalk.dim(`Using policy file: ${policyPath}`));
    }
  }

  const format = (options.format || 'text') as OutputFormat;
  const failOn = (options.failOn || 'error') as Severity;

  if (options.verbose) {
    console.log(chalk.dim(`Scanning: ${resolvedPath}`));
    console.log(chalk.dim(`Fail on: ${failOn}`));
    console.log();
  }

  try {
    const summary = await scanPrompts({
      policyPath: policyPath!,
      targetPath: resolvedPath,
      environment: options.env,
    });

    const output = formatOutput(summary, format, resolvedPath);
    console.log(output);

    if (shouldFailBuild(summary, failOn)) {
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red(`Error during scan: ${error}`));
    process.exit(1);
  }
};
