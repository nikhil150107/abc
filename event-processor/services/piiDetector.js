const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const PHONE_REGEX = /\b(?:\+91[\s-]?)?[6-9]\d{9}\b/g;
const PAN_REGEX = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g;
const AADHAAR_REGEX = /\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b/g;

const PII_PATTERNS = [
  { type: 'EMAIL', regex: EMAIL_REGEX },
  { type: 'PHONE', regex: PHONE_REGEX },
  { type: 'PAN', regex: PAN_REGEX },
  { type: 'AADHAAR', regex: AADHAAR_REGEX },
];

function maskValue(value, type) {
  if (!value || typeof value !== 'string') return value;
  if (type === 'EMAIL') {
    const [local, domain] = value.split('@');
    return `${local[0]}***@${domain}`;
  }
  if (type === 'PHONE') return `******${value.slice(-4)}`;
  if (type === 'PAN') return `${value.slice(0, 2)}****${value.slice(-2)}`;
  if (type === 'AADHAAR') return `**** **** ${value.replace(/\s/g, '').slice(-4)}`;
  return '***';
}

function scanObject(obj, path = '') {
  const findings = [];

  if (obj === null || obj === undefined) return findings;

  if (typeof obj === 'string') {
    for (const { type, regex } of PII_PATTERNS) {
      regex.lastIndex = 0;
      if (regex.test(obj)) {
        findings.push({ type, field: path || 'value', maskedValue: maskValue(obj, type) });
      }
    }
    return findings;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      findings.push(...scanObject(item, path ? `${path}[${index}]` : `[${index}]`));
    });
    return findings;
  }

  if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      const fieldPath = path ? `${path}.${key}` : key;

      if (typeof value === 'string') {
        const keyLower = key.toLowerCase();
        if (keyLower.includes('email') && EMAIL_REGEX.test(value)) {
          findings.push({ type: 'EMAIL', field: fieldPath, maskedValue: maskValue(value, 'EMAIL') });
        } else if (keyLower.includes('phone') && PHONE_REGEX.test(value)) {
          findings.push({ type: 'PHONE', field: fieldPath, maskedValue: maskValue(value, 'PHONE') });
        } else if (keyLower.includes('pan') && PAN_REGEX.test(value)) {
          findings.push({ type: 'PAN', field: fieldPath, maskedValue: maskValue(value, 'PAN') });
        } else if (keyLower.includes('aadhaar') && AADHAAR_REGEX.test(value)) {
          findings.push({ type: 'AADHAAR', field: fieldPath, maskedValue: maskValue(value, 'AADHAAR') });
        } else if (keyLower.includes('address') && value.length > 10) {
          findings.push({ type: 'ADDRESS', field: fieldPath, maskedValue: '***' });
        } else {
          findings.push(...scanObject(value, fieldPath));
        }
      } else {
        findings.push(...scanObject(value, fieldPath));
      }
    }
  }

  return findings;
}

function detectPII(payload) {
  const rawFindings = scanObject(payload);
  const seen = new Set();
  const detectedPII = [];

  for (const finding of rawFindings) {
    const key = `${finding.type}:${finding.field}`;
    if (!seen.has(key)) {
      seen.add(key);
      detectedPII.push({ type: finding.type, field: finding.field, maskedValue: finding.maskedValue });
    }
  }

  return detectedPII;
}

module.exports = { detectPII, maskValue };
