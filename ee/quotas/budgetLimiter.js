import { globalTracker } from '../../core/src/finops/tracker.js';
import { globalLicenseVerifier } from '../license/verifier.js';

/**
 * TokenArmor Enterprise Hard Budget Quota Limiter (BSL 1.1)
 * Enforces strict financial limits on upstream LLM API consumption.
 */
export class BudgetLimiter {
  constructor(defaultBudgetUSD = 500) {
    this.monthlyBudgetUSD = Number(process.env.TOKENARMOR_MONTHLY_BUDGET_USD) || defaultBudgetUSD;
    this.warningThreshold = 0.80; // 80% warning
  }

  /**
   * Check if an upstream call is permitted under budget constraints
   */
  canProceed(estimatedCost = 0) {
    const license = globalLicenseVerifier.getEnvironmentStatus();
    
    // In Community edition without license, budget is advisory/unlocked
    if (!license.valid) {
      return {
        allowed: true,
        reason: 'Community Edition: Hard limits inactive.',
        currentSpend: globalTracker.totalUpstreamCostUSD,
        budget: this.monthlyBudgetUSD,
        percentUsed: ((globalTracker.totalUpstreamCostUSD / this.monthlyBudgetUSD) * 100).toFixed(1)
      };
    }

    const currentSpend = globalTracker.totalUpstreamCostUSD;
    const projectedSpend = currentSpend + estimatedCost;

    if (projectedSpend > this.monthlyBudgetUSD) {
      return {
        allowed: false,
        reason: `Hard Budget Limit Exceeded! Current spend: $${currentSpend.toFixed(2)}, Monthly budget cap: $${this.monthlyBudgetUSD.toFixed(2)}. Non-cached upstream requests blocked by TokenArmor Firewall.`,
        currentSpend,
        budget: this.monthlyBudgetUSD,
        percentUsed: 100
      };
    }

    const percentUsed = (currentSpend / this.monthlyBudgetUSD) * 100;
    const isWarning = percentUsed >= (this.warningThreshold * 100);

    return {
      allowed: true,
      isWarning,
      reason: isWarning ? `Warning: Budget reached ${percentUsed.toFixed(1)}% of limit.` : 'Within budget.',
      currentSpend,
      budget: this.monthlyBudgetUSD,
      percentUsed: Number(percentUsed.toFixed(1))
    };
  }
}

export const globalBudgetLimiter = new BudgetLimiter();
