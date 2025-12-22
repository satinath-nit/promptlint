import chalk from 'chalk';
import { ScanSummary, ScanResult, Violation, OutputFormat, Severity } from '../types';

export const formatViolation = (violation: Violation, filePath?: string): string => {
  const severityColor = getSeverityColor(violation.severity);
  const severityLabel = severityColor(violation.severity.toUpperCase().padEnd(5));
  
  let output = `  ${severityLabel} [${violation.policyId}] ${violation.description}\n`;
  output += `         Match: "${chalk.yellow(violation.match.text)}" at position ${violation.match.start}-${violation.match.end}\n`;
  
  if (violation.message) {
    output += `         ${chalk.dim(violation.message)}\n`;
  }

  return output;
};

export const formatScanResult = (result: ScanResult, basePath: string = ''): string => {
  if (result.violations.length === 0) {
    return '';
  }

  const relativePath = result.file.replace(basePath, '').replace(/^\//, '');
  let output = `\n${chalk.underline(relativePath)}\n`;

  for (const violation of result.violations) {
    output += formatViolation(violation, result.file);
  }

  return output;
};

export const formatSummary = (summary: ScanSummary, basePath: string = ''): string => {
  let output = '';

  for (const result of summary.results) {
    output += formatScanResult(result, basePath);
  }

  output += '\n' + chalk.bold('Summary:\n');
  output += `  Files scanned: ${summary.totalFiles}\n`;
  output += `  Files with violations: ${summary.filesWithViolations}\n`;
  output += `  Total violations: ${summary.totalViolations}\n`;

  if (summary.errorCount > 0) {
    output += `    ${chalk.red(`Errors: ${summary.errorCount}`)}\n`;
  }
  if (summary.warnCount > 0) {
    output += `    ${chalk.yellow(`Warnings: ${summary.warnCount}`)}\n`;
  }
  if (summary.infoCount > 0) {
    output += `    ${chalk.blue(`Info: ${summary.infoCount}`)}\n`;
  }

  if (summary.totalViolations === 0) {
    output += chalk.green('\nNo policy violations found!\n');
  }

  return output;
};

export const formatAsJson = (summary: ScanSummary): string => {
  return JSON.stringify(summary, null, 2);
};

export const formatAsSarif = (summary: ScanSummary): string => {
  const sarif = {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'promptlint',
            version: '0.1.0',
            informationUri: 'https://github.com/youcommit/promptlint',
            rules: getUniqueRules(summary),
          },
        },
        results: summary.results.flatMap((result) =>
          result.violations.map((violation) => ({
            ruleId: violation.policyId,
            level: mapSeverityToSarif(violation.severity),
            message: {
              text: violation.description,
            },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: {
                    uri: result.file,
                  },
                  region: {
                    startColumn: violation.match.start,
                    endColumn: violation.match.end,
                  },
                },
              },
            ],
          }))
        ),
      },
    ],
  };

  return JSON.stringify(sarif, null, 2);
};

const getUniqueRules = (summary: ScanSummary): Array<{ id: string; shortDescription: { text: string } }> => {
  const rules = new Map<string, string>();
  
  for (const result of summary.results) {
    for (const violation of result.violations) {
      if (!rules.has(violation.policyId)) {
        rules.set(violation.policyId, violation.description);
      }
    }
  }

  return Array.from(rules.entries()).map(([id, description]) => ({
    id,
    shortDescription: { text: description },
  }));
};

const mapSeverityToSarif = (severity: Severity): string => {
  switch (severity) {
    case 'error':
      return 'error';
    case 'warn':
      return 'warning';
    case 'info':
      return 'note';
    default:
      return 'warning';
  }
};

const getSeverityColor = (severity: Severity): chalk.Chalk => {
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

export const formatOutput = (
  summary: ScanSummary,
  format: OutputFormat,
  basePath: string = ''
): string => {
  switch (format) {
    case 'json':
      return formatAsJson(summary);
    case 'sarif':
      return formatAsSarif(summary);
    case 'text':
    default:
      return formatSummary(summary, basePath);
  }
};
