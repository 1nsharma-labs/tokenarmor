import crypto from 'node:crypto';

/**
 * TokenArmor Enterprise License Key Verifier (BSL 1.1)
 * Validates cryptographically signed offline license keys without external phone-home network dependency.
 */

// Master verification public seed for 1nsharma-labs
const DEFAULT_VERIFICATION_SECRET = process.env.TOKENARMOR_MASTER_SECRET || '1nsharma-labs-tokenarmor-secure-enterprise-seed-2026';

export class LicenseVerifier {
  constructor(secret = DEFAULT_VERIFICATION_SECRET) {
    this.secret = secret;
  }

  /**
   * Generates a signed enterprise license key (Used by 1nsharma-labs billing engine)
   * Format: TARM-<TIER>-<ORG>-<EXPIRY_TIMESTAMP>-<SIG>
   */
  generateKey(organization = 'customer', daysValid = 365, tier = 'ENT') {
    const cleanOrg = organization.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const expiryTimestamp = Math.floor(Date.now() / 1000) + (daysValid * 86400);
    const payload = `${tier}:${cleanOrg}:${expiryTimestamp}`;
    
    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(payload)
      .digest('hex')
      .substring(0, 16)
      .toUpperCase();

    return `TARM-${tier}-${cleanOrg}-${expiryTimestamp}-${signature}`;
  }

  /**
   * Verifies an enterprise license key offline
   */
  verifyKey(licenseKey) {
    if (!licenseKey || typeof licenseKey !== 'string') {
      return {
        valid: false,
        tier: 'COMMUNITY',
        reason: 'No license key provided (Running Community Edition).'
      };
    }

    const parts = licenseKey.trim().split('-');
    if (parts.length < 5 || parts[0] !== 'TARM') {
      return {
        valid: false,
        tier: 'COMMUNITY',
        reason: 'Invalid license key format.'
      };
    }

    const [prefix, tier, organization, expiryStr, signature] = parts;
    const expiryTimestamp = parseInt(expiryStr, 10);

    if (isNaN(expiryTimestamp)) {
      return {
        valid: false,
        tier: 'COMMUNITY',
        reason: 'Invalid expiration timestamp in key.'
      };
    }

    // Check expiration date
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (currentTimestamp > expiryTimestamp) {
      const expiredOn = new Date(expiryTimestamp * 1000).toISOString().split('T')[0];
      return {
        valid: false,
        tier: 'COMMUNITY',
        reason: `License key expired on ${expiredOn}. Please renew at 1nsharma-labs.`
      };
    }

    // Verify HMAC cryptographic signature
    const payload = `${tier}:${organization}:${expiryTimestamp}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.secret)
      .update(payload)
      .digest('hex')
      .substring(0, 16)
      .toUpperCase();

    if (signature !== expectedSignature) {
      return {
        valid: false,
        tier: 'COMMUNITY',
        reason: 'Cryptographic signature verification failed (tampered or forged key).'
      };
    }

    const expiresDate = new Date(expiryTimestamp * 1000).toISOString().split('T')[0];
    return {
      valid: true,
      tier: tier === 'ENT' ? 'ENTERPRISE' : 'PRO',
      organization,
      expiresAt: expiresDate,
      features: {
        hardBudgetQuotas: true,
        piiScrubber: true,
        auditLogging: true,
        prioritySLA: true
      }
    };
  }

  /**
   * Checks current running environment license status
   */
  getEnvironmentStatus() {
    const key = process.env.TOKENARMOR_LICENSE_KEY;
    return this.verifyKey(key);
  }
}

export const globalLicenseVerifier = new LicenseVerifier();
