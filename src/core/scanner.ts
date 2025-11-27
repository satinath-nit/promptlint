import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { 
  Policy, 
  ScanResult, 
  ScanSummary, 
  Violation,
  Severity 
} from '../types';
import { PromptValidator } from './validator';

export interface ScanOptions {
  policyPath: string;
  targetPath: string;
  filePatterns?: string[];
  excludePatterns?: string[];
  environment?: string;
}

const DEFAULT_FILE_PATTERNS = [
  '**/*.prompt',
  '**/*.prompt.txt',
  '**/*.prompt.md',
  '**/prompts/**/*.txt',
  '**/prompts/**/*.md',
  '**/prompts/**/*.yaml',
  '**/prompts/**/*.yml',
];

const DEFAULT_EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.git/**',
  '**/vendor/**',
];

export class PromptScanner {
  private validator: PromptValidator;
  private options: ScanOptions;

  constructor(options: ScanOptions) {
    this.options = options;
    this.validator = new PromptValidator();
  }

  async initialize(): Promise<void> {
    await this.validator.loadPolicies(this.options.policyPath, this.options.environment);
  }

  async scan(): Promise<ScanSummary> {
    const files = await this.findFiles();
    const results: ScanResult[] = [];

    for (const file of files) {
      const result = await this.scanFile(file);
      results.push(result);
    }

    return this.generateSummary(results);
  }

  private async findFiles(): Promise<string[]> {
    const patterns = this.options.filePatterns ?? DEFAULT_FILE_PATTERNS;
    const excludePatterns = this.options.excludePatterns ?? DEFAULT_EXCLUDE_PATTERNS;
    
    const targetPath = path.resolve(this.options.targetPath);
    const allFiles: string[] = [];

    for (const pattern of patterns) {
      const files = await glob(pattern, {
        cwd: targetPath,
        ignore: excludePatterns,
        absolute: true,
        nodir: true,
      });
      allFiles.push(...files);
    }

    return [...new Set(allFiles)];
  }

  private async scanFile(filePath: string): Promise<ScanResult> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const result = this.validator.validate(content);

    return {
      file: filePath,
      violations: result.violations,
      scannedAt: new Date(),
    };
  }

  private generateSummary(results: ScanResult[]): ScanSummary {
    const filesWithViolations = results.filter((r) => r.violations.length > 0);
    const allViolations = results.flatMap((r) => r.violations);

    return {
      totalFiles: results.length,
      filesWithViolations: filesWithViolations.length,
      totalViolations: allViolations.length,
      errorCount: allViolations.filter((v) => v.severity === 'error').length,
      warnCount: allViolations.filter((v) => v.severity === 'warn').length,
      infoCount: allViolations.filter((v) => v.severity === 'info').length,
      results,
    };
  }

  getPolicies(): Policy[] {
    return this.validator.getPolicies();
  }
}

export const scanPrompts = async (options: ScanOptions): Promise<ScanSummary> => {
  const scanner = new PromptScanner(options);
  await scanner.initialize();
  return scanner.scan();
};

export const shouldFailBuild = (summary: ScanSummary, failOn: Severity): boolean => {
  switch (failOn) {
    case 'error':
      return summary.errorCount > 0;
    case 'warn':
      return summary.errorCount > 0 || summary.warnCount > 0;
    case 'info':
      return summary.totalViolations > 0;
    default:
      return summary.errorCount > 0;
  }
};
