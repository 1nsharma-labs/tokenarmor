import { globalLicenseVerifier } from '../license/verifier.js';

/**
 * TokenArmor Enterprise PII & Prompt Security Scrubber (BSL 1.1)
 * Redacts personal identifiable information (PII) and secret credentials before upstream forwarding.
 */

const PII_PATTERNS = [
  // 1. API Keys & Secrets (Must run before general number/phone matching)
  {
    type: 'API_KEY',
    regex: /\b(sk-[a-zA-Z0-9_\-]{16,}|ghp_[a-zA-Z0-9]{20,}|AKIA[0-9A-Z]{16})\b/g,
    replacement: '[REDACTED_SECRET_KEY]'
  },
  // 2. Email addresses
  {
    type: 'EMAIL',
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: '[REDACTED_EMAIL]'
  },
  // 3. Credit Card Numbers (13 to 19 digits)
  {
    type: 'CREDIT_CARD',
    regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    replacement: '[REDACTED_CREDIT_CARD]'
  },
  // 4. National ID / SSN format (3-2-4 digits) or Indian Aadhaar (4-4-4 digits)
  {
    type: 'NATIONAL_ID',
    regex: /\b\d{4}\s\d{4}\s\d{4}\b|\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: '[REDACTED_ID]'
  },
  // 5. Phone numbers (Proper word boundaries)
  {
    type: 'PHONE',
    regex: /(?:\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b)/g,
    replacement: '[REDACTED_PHONE]'
  }
];

export function scrubText(text = '') {
  if (typeof text !== 'string') return { scrubbed: text, redactedCount: 0 };
  let scrubbed = text;
  let redactedCount = 0;

  for (const { regex, replacement } of PII_PATTERNS) {
    scrubbed = scrubbed.replace(regex, () => {
      redactedCount++;
      return replacement;
    });
  }

  return { scrubbed, redactedCount };
}

export function scrubMessages(messages = []) {
  const license = globalLicenseVerifier.getEnvironmentStatus();
  
  // If license is not active, return messages untouched
  if (!license.valid) {
    return { messages, scrubbedCount: 0 };
  }

  let totalRedactions = 0;
  const sanitizedMessages = messages.map(msg => {
    if (typeof msg.content === 'string') {
      const { scrubbed, redactedCount } = scrubText(msg.content);
      totalRedactions += redactedCount;
      return { ...msg, content: scrubbed };
    }
    return msg;
  });

  return {
    messages: sanitizedMessages,
    scrubbedCount: totalRedactions
  };
}
