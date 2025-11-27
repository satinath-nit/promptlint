import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { PolicyFile, Policy } from '../types';

export class PolicyLoader {
  private policyFile: PolicyFile | null = null;
  private filePath: string | null = null;

  async loadFromFile(filePath: string): Promise<PolicyFile> {
    const absolutePath = path.resolve(filePath);
    
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Policy file not found: ${absolutePath}`);
    }

    const content = fs.readFileSync(absolutePath, 'utf-8');
    const ext = path.extname(absolutePath).toLowerCase();

    let parsed: PolicyFile;
    
    if (ext === '.yaml' || ext === '.yml') {
      parsed = yaml.load(content) as PolicyFile;
    } else if (ext === '.json') {
      parsed = JSON.parse(content) as PolicyFile;
    } else {
      throw new Error(`Unsupported policy file format: ${ext}. Use .yaml, .yml, or .json`);
    }

    this.validatePolicyFile(parsed);
    this.policyFile = parsed;
    this.filePath = absolutePath;
    
    return parsed;
  }

  loadFromString(content: string, format: 'yaml' | 'json' = 'yaml'): PolicyFile {
    let parsed: PolicyFile;
    
    if (format === 'yaml') {
      parsed = yaml.load(content) as PolicyFile;
    } else {
      parsed = JSON.parse(content) as PolicyFile;
    }

    this.validatePolicyFile(parsed);
    this.policyFile = parsed;
    
    return parsed;
  }

  private validatePolicyFile(policyFile: PolicyFile): void {
    if (!policyFile.version) {
      throw new Error('Policy file must have a version field');
    }

    if (policyFile.version !== 1) {
      throw new Error(`Unsupported policy version: ${policyFile.version}. Only version 1 is supported.`);
    }

    if (!Array.isArray(policyFile.policies)) {
      throw new Error('Policy file must have a policies array');
    }

    const policyIds = new Set<string>();
    
    for (const policy of policyFile.policies) {
      this.validatePolicy(policy, policyIds);
    }
  }

  private validatePolicy(policy: Policy, existingIds: Set<string>): void {
    if (!policy.id) {
      throw new Error('Each policy must have an id');
    }

    if (existingIds.has(policy.id)) {
      throw new Error(`Duplicate policy id: ${policy.id}`);
    }
    existingIds.add(policy.id);

    if (!policy.description) {
      throw new Error(`Policy ${policy.id} must have a description`);
    }

    if (!policy.severity || !['error', 'warn', 'info'].includes(policy.severity)) {
      throw new Error(`Policy ${policy.id} must have a valid severity (error, warn, or info)`);
    }

    if (!policy.match) {
      throw new Error(`Policy ${policy.id} must have a match configuration`);
    }

    if (!policy.match.type || !['regex', 'built_in', 'list'].includes(policy.match.type)) {
      throw new Error(`Policy ${policy.id} must have a valid match type (regex, built_in, or list)`);
    }

    if (policy.match.type === 'regex' && !policy.match.pattern) {
      throw new Error(`Policy ${policy.id} with regex match type must have a pattern`);
    }

    if (policy.match.type === 'built_in' && !policy.match.detector) {
      throw new Error(`Policy ${policy.id} with built_in match type must have a detector`);
    }

    if (policy.match.type === 'list' && (!policy.match.terms || !Array.isArray(policy.match.terms))) {
      throw new Error(`Policy ${policy.id} with list match type must have a terms array`);
    }

    if (!Array.isArray(policy.actions) || policy.actions.length === 0) {
      throw new Error(`Policy ${policy.id} must have at least one action`);
    }

    for (const action of policy.actions) {
      if (!action.type || !['block', 'warn', 'annotate', 'suggest_redact', 'message', 'tag'].includes(action.type)) {
        throw new Error(`Policy ${policy.id} has an invalid action type`);
      }
    }
  }

  getPolicies(environment?: string): Policy[] {
    if (!this.policyFile) {
      throw new Error('No policy file loaded');
    }

    let policies = [...this.policyFile.policies];

    if (environment && this.policyFile.overrides) {
      const envOverride = this.policyFile.overrides.find((o) => o.env === environment);
      
      if (envOverride) {
        if (envOverride.disable_policies) {
          policies = policies.filter((p) => !envOverride.disable_policies!.includes(p.id));
        }
        if (envOverride.enable_policies) {
          policies = policies.filter(
            (p) => p.enabled !== false || envOverride.enable_policies!.includes(p.id)
          );
        }
      }
    }

    return policies.filter((p) => p.enabled !== false);
  }

  getFilePath(): string | null {
    return this.filePath;
  }
}

export const findPolicyFile = (startDir: string = process.cwd()): string | null => {
  const policyFileNames = [
    'prompt-policy.yml',
    'prompt-policy.yaml',
    'prompt-policy.json',
    '.promptlintrc.yml',
    '.promptlintrc.yaml',
    '.promptlintrc.json',
  ];

  let currentDir = path.resolve(startDir);
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    for (const fileName of policyFileNames) {
      const filePath = path.join(currentDir, fileName);
      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }
    currentDir = path.dirname(currentDir);
  }

  return null;
};
