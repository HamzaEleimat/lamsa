/**
 * Fee Calculation Service
 * Handles platform fee calculations based on BeautyCort's pricing rules
 * 
 * Fee Rules:
 * - Services ≤25 JOD: 2 JOD platform fee
 * - Services >25 JOD: 5 JOD platform fee
 */

export interface FeeCalculation {
  serviceAmount: number;
  platformFee: number;
  providerEarnings: number;
  feePercentage: number;
}

export class FeeCalculationService {
  private static readonly LOW_TIER_THRESHOLD = 25; // JOD
  private static readonly LOW_TIER_FEE = 2; // JOD
  private static readonly HIGH_TIER_FEE = 5; // JOD

  /**
   * Calculate platform fee based on service amount
   * @param amount Service amount in JOD
   * @returns Platform fee in JOD
   */
  static calculatePlatformFee(amount: number): number {
    if (amount <= 0) {
      throw new Error('Service amount must be positive');
    }

    return amount <= this.LOW_TIER_THRESHOLD 
      ? this.LOW_TIER_FEE 
      : this.HIGH_TIER_FEE;
  }

  /**
   * Calculate provider earnings after platform fee
   * @param amount Service amount in JOD
   * @returns Provider earnings in JOD
   */
  static calculateProviderEarnings(amount: number): number {
    const platformFee = this.calculatePlatformFee(amount);
    const earnings = amount - platformFee;
    
    if (earnings < 0) {
      throw new Error('Platform fee cannot exceed service amount');
    }
    
    return Number(earnings.toFixed(2));
  }

  /**
   * Calculate effective fee percentage for reporting
   * @param amount Service amount in JOD
   * @returns Fee percentage (0-100)
   */
  static calculateFeePercentage(amount: number): number {
    const platformFee = this.calculatePlatformFee(amount);
    return Number(((platformFee / amount) * 100).toFixed(2));
  }

  /**
   * Get complete fee breakdown for a service
   * @param amount Service amount in JOD
   * @returns Complete fee calculation breakdown
   */
  static getCompleteCalculation(amount: number): FeeCalculation {
    const platformFee = this.calculatePlatformFee(amount);
    const providerEarnings = this.calculateProviderEarnings(amount);
    const feePercentage = this.calculateFeePercentage(amount);

    return {
      serviceAmount: Number(amount.toFixed(2)),
      platformFee: Number(platformFee.toFixed(2)),
      providerEarnings,
      feePercentage
    };
  }

  /**
   * Validate that fee calculation is correct for given amount
   * @param amount Service amount
   * @param platformFee Calculated platform fee
   * @param providerFee Provider earnings
   * @returns True if calculation is valid
   */
  static validateCalculation(amount: number, platformFee: number, providerFee: number): boolean {
    const expectedCalculation = this.getCompleteCalculation(amount);
    
    return (
      Math.abs(expectedCalculation.platformFee - platformFee) < 0.01 &&
      Math.abs(expectedCalculation.providerEarnings - providerFee) < 0.01 &&
      Math.abs(amount - (platformFee + providerFee)) < 0.01
    );
  }

  /**
   * Get fee tier information for display purposes
   * @param amount Service amount in JOD
   * @returns Fee tier information
   */
  static getFeeTierInfo(amount: number): {
    tier: 'low' | 'high';
    threshold: number;
    fee: number;
    description: string;
  } {
    const isLowTier = amount <= this.LOW_TIER_THRESHOLD;
    
    return {
      tier: isLowTier ? 'low' : 'high',
      threshold: this.LOW_TIER_THRESHOLD,
      fee: isLowTier ? this.LOW_TIER_FEE : this.HIGH_TIER_FEE,
      description: isLowTier 
        ? `Services up to ${this.LOW_TIER_THRESHOLD} JOD have a ${this.LOW_TIER_FEE} JOD platform fee`
        : `Services over ${this.LOW_TIER_THRESHOLD} JOD have a ${this.HIGH_TIER_FEE} JOD platform fee`
    };
  }

  /**
   * Calculate bulk fees for multiple services
   * @param amounts Array of service amounts
   * @returns Array of fee calculations
   */
  static calculateBulkFees(amounts: number[]): FeeCalculation[] {
    return amounts.map(amount => this.getCompleteCalculation(amount));
  }

  /**
   * Get summary of bulk calculations
   * @param amounts Array of service amounts
   * @returns Summary totals
   */
  static getBulkSummary(amounts: number[]): {
    totalServiceAmount: number;
    totalPlatformFees: number;
    totalProviderEarnings: number;
    averageFeePercentage: number;
    serviceCount: number;
  } {
    const calculations = this.calculateBulkFees(amounts);
    
    const totalServiceAmount = calculations.reduce((sum, calc) => sum + calc.serviceAmount, 0);
    const totalPlatformFees = calculations.reduce((sum, calc) => sum + calc.platformFee, 0);
    const totalProviderEarnings = calculations.reduce((sum, calc) => sum + calc.providerEarnings, 0);
    const averageFeePercentage = calculations.reduce((sum, calc) => sum + calc.feePercentage, 0) / calculations.length;

    return {
      totalServiceAmount: Number(totalServiceAmount.toFixed(2)),
      totalPlatformFees: Number(totalPlatformFees.toFixed(2)),
      totalProviderEarnings: Number(totalProviderEarnings.toFixed(2)),
      averageFeePercentage: Number(averageFeePercentage.toFixed(2)),
      serviceCount: calculations.length
    };
  }
}

export const feeCalculationService = new FeeCalculationService();