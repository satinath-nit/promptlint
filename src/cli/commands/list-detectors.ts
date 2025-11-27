import chalk from 'chalk';
import { listDetectors } from '../../detectors';

export const listDetectorsCommand = async (): Promise<void> => {
  const detectors = listDetectors();

  console.log(chalk.bold('Built-in Detectors:\n'));

  for (const detector of detectors) {
    console.log(`  ${chalk.cyan(detector.name)}`);
    console.log(`    ${chalk.dim(detector.description)}`);
    console.log();
  }

  console.log(chalk.dim(`Total: ${detectors.length} built-in detectors`));
  console.log();
  console.log(chalk.dim('Usage in policy file:'));
  console.log(chalk.dim('  match:'));
  console.log(chalk.dim('    type: built_in'));
  console.log(chalk.dim('    detector: <detector_name>'));
};
