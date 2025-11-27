import { Detector, DetectorResult, BuiltInDetector } from '../types';

const createRegexDetector = (
  name: string,
  description: string,
  pattern: RegExp
): Detector => ({
  name,
  description,
  detect(text: string): DetectorResult {
    const matches: Array<{ text: string; start: number; end: number }> = [];
    let match: RegExpExecArray | null;
    const regex = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
    
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        text: match[0],
        start: match.index,
        end: match.index + match[0].length,
      });
    }
    
    return {
      matched: matches.length > 0,
      matches,
    };
  },
});

export const emailDetector = createRegexDetector(
  'email',
  'Detects email addresses',
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi
);

export const phoneDetector = createRegexDetector(
  'phone',
  'Detects phone numbers (US format)',
  /(?:\+1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g
);

export const ssnDetector = createRegexDetector(
  'ssn',
  'Detects US Social Security Numbers',
  /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g
);

export const creditCardDetector = createRegexDetector(
  'credit_card',
  'Detects credit card numbers',
  /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})\b/g
);

export const ipv4Detector = createRegexDetector(
  'ipv4',
  'Detects IPv4 addresses',
  /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g
);

export const ipv6Detector = createRegexDetector(
  'ipv6',
  'Detects IPv6 addresses',
  /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b|\b(?:[0-9a-fA-F]{1,4}:){1,7}:|\b(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}\b/g
);

export const urlDetector = createRegexDetector(
  'url',
  'Detects URLs',
  /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi
);

export const apiKeyDetector = createRegexDetector(
  'api_key',
  'Detects common API key patterns',
  /(?:api[_-]?key|apikey|api[_-]?secret|secret[_-]?key)[\s]*[=:]\s*['"]?([a-zA-Z0-9_\-]{20,})['"]?/gi
);

export const awsKeyDetector = createRegexDetector(
  'aws_key',
  'Detects AWS access keys',
  /(?:AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}/g
);

export const jwtDetector = createRegexDetector(
  'jwt',
  'Detects JWT tokens',
  /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g
);

export const builtInDetectors: Record<BuiltInDetector, Detector> = {
  email: emailDetector,
  phone: phoneDetector,
  ssn: ssnDetector,
  credit_card: creditCardDetector,
  ipv4: ipv4Detector,
  ipv6: ipv6Detector,
  url: urlDetector,
  api_key: apiKeyDetector,
  aws_key: awsKeyDetector,
  jwt: jwtDetector,
};

export const getDetector = (name: BuiltInDetector): Detector | undefined => {
  return builtInDetectors[name];
};

export const listDetectors = (): Array<{ name: string; description: string }> => {
  return Object.values(builtInDetectors).map((d) => ({
    name: d.name,
    description: d.description,
  }));
};

export const createCustomRegexDetector = (
  name: string,
  description: string,
  pattern: string,
  flags: string = 'gi'
): Detector => {
  return createRegexDetector(name, description, new RegExp(pattern, flags));
};

export const createTermListDetector = (
  name: string,
  description: string,
  terms: string[],
  caseSensitive: boolean = false
): Detector => {
  const escapedTerms = terms.map((t) =>
    t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  const pattern = new RegExp(
    `\\b(${escapedTerms.join('|')})\\b`,
    caseSensitive ? 'g' : 'gi'
  );
  return createRegexDetector(name, description, pattern);
};
