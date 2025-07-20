/**
 * Unit tests for FeeCalculationService
 * Critical business logic for platform monetization
 */

import { FeeCalculationService } from '../../../src/services/fee-calculation.service';

describe('FeeCalculationService', () => {
  describe('calculatePlatformFee', () => {
    it('should charge 2 JOD for services <= 25 JOD', () => {
      expect(FeeCalculationService.calculatePlatformFee(10)).toBe(2);
      expect(FeeCalculationService.calculatePlatformFee(25)).toBe(2);
      expect(FeeCalculationService.calculatePlatformFee(1)).toBe(2);
    });

    it('should charge 5 JOD for services > 25 JOD', () => {
      expect(FeeCalculationService.calculatePlatformFee(26)).toBe(5);
      expect(FeeCalculationService.calculatePlatformFee(50)).toBe(5);
      expect(FeeCalculationService.calculatePlatformFee(100)).toBe(5);
      expect(FeeCalculationService.calculatePlatformFee(25.01)).toBe(5);
    });

    it('should throw error for non-positive amounts', () => {
      expect(() => FeeCalculationService.calculatePlatformFee(0))
        .toThrow('Service amount must be positive');
      expect(() => FeeCalculationService.calculatePlatformFee(-10))
        .toThrow('Service amount must be positive');
    });
  });

  describe('calculateProviderEarnings', () => {
    it('should calculate correct earnings for low tier', () => {
      expect(FeeCalculationService.calculateProviderEarnings(10)).toBe(8); // 10 - 2
      expect(FeeCalculationService.calculateProviderEarnings(25)).toBe(23); // 25 - 2
    });

    it('should calculate correct earnings for high tier', () => {
      expect(FeeCalculationService.calculateProviderEarnings(30)).toBe(25); // 30 - 5
      expect(FeeCalculationService.calculateProviderEarnings(100)).toBe(95); // 100 - 5
    });

    it('should handle decimal amounts correctly', () => {
      expect(FeeCalculationService.calculateProviderEarnings(10.50)).toBe(8.50);
      expect(FeeCalculationService.calculateProviderEarnings(25.99)).toBe(20.99); // 25.99 > 25, so 5 JOD fee
      expect(FeeCalculationService.calculateProviderEarnings(30.50)).toBe(25.50);
    });

    it('should round to 2 decimal places', () => {
      expect(FeeCalculationService.calculateProviderEarnings(10.999)).toBe(9);
      expect(FeeCalculationService.calculateProviderEarnings(10.001)).toBe(8);
    });
  });

  describe('calculateFeePercentage', () => {
    it('should calculate correct percentage for low tier', () => {
      expect(FeeCalculationService.calculateFeePercentage(10)).toBe(20); // 2/10 * 100
      expect(FeeCalculationService.calculateFeePercentage(25)).toBe(8); // 2/25 * 100
      expect(FeeCalculationService.calculateFeePercentage(20)).toBe(10); // 2/20 * 100
    });

    it('should calculate correct percentage for high tier', () => {
      expect(FeeCalculationService.calculateFeePercentage(50)).toBe(10); // 5/50 * 100
      expect(FeeCalculationService.calculateFeePercentage(100)).toBe(5); // 5/100 * 100
      expect(FeeCalculationService.calculateFeePercentage(30)).toBeCloseTo(16.67, 1); // 5/30 * 100
    });

    it('should round percentage to 2 decimal places', () => {
      expect(FeeCalculationService.calculateFeePercentage(33.33)).toBeCloseTo(15, 0);
      expect(FeeCalculationService.calculateFeePercentage(15)).toBeCloseTo(13.33, 2);
    });
  });

  describe('getCompleteCalculation', () => {
    it('should return complete calculation for low tier', () => {
      const result = FeeCalculationService.getCompleteCalculation(20);
      
      expect(result).toEqual({
        serviceAmount: 20,
        platformFee: 2,
        providerEarnings: 18,
        feePercentage: 10
      });
    });

    it('should return complete calculation for high tier', () => {
      const result = FeeCalculationService.getCompleteCalculation(50);
      
      expect(result).toEqual({
        serviceAmount: 50,
        platformFee: 5,
        providerEarnings: 45,
        feePercentage: 10
      });
    });

    it('should handle decimal amounts', () => {
      const result = FeeCalculationService.getCompleteCalculation(25.50);
      
      expect(result).toEqual({
        serviceAmount: 25.50,
        platformFee: 5,
        providerEarnings: 20.50,
        feePercentage: expect.any(Number)
      });
      expect(result.feePercentage).toBeCloseTo(19.61, 2);
    });
  });

  describe('validateCalculation', () => {
    it('should validate correct calculations', () => {
      expect(FeeCalculationService.validateCalculation(20, 2, 18)).toBe(true);
      expect(FeeCalculationService.validateCalculation(50, 5, 45)).toBe(true);
    });

    it('should reject incorrect calculations', () => {
      expect(FeeCalculationService.validateCalculation(20, 5, 15)).toBe(false); // Wrong fee
      expect(FeeCalculationService.validateCalculation(20, 2, 17)).toBe(false); // Wrong earnings
      expect(FeeCalculationService.validateCalculation(50, 2, 48)).toBe(false); // Wrong tier
    });

    it('should handle floating point precision', () => {
      expect(FeeCalculationService.validateCalculation(10.50, 2, 8.50)).toBe(true);
      expect(FeeCalculationService.validateCalculation(10.50, 2.00, 8.50)).toBe(true);
    });
  });

  describe('Edge cases and business rules', () => {
    it('should handle tier boundary correctly', () => {
      // Exactly at 25 JOD should be low tier
      const at25 = FeeCalculationService.getCompleteCalculation(25);
      expect(at25.platformFee).toBe(2);
      
      // Just above 25 JOD should be high tier
      const above25 = FeeCalculationService.getCompleteCalculation(25.01);
      expect(above25.platformFee).toBe(5);
    });

    it('should never have negative provider earnings', () => {
      // Even for very small amounts, provider should earn something
      const smallAmount = FeeCalculationService.getCompleteCalculation(2.50);
      expect(smallAmount.providerEarnings).toBe(0.50);
      expect(smallAmount.providerEarnings).toBeGreaterThan(0);
    });

    it('should handle very large amounts', () => {
      const largeAmount = FeeCalculationService.getCompleteCalculation(10000);
      expect(largeAmount.platformFee).toBe(5); // Still just 5 JOD
      expect(largeAmount.providerEarnings).toBe(9995);
      expect(largeAmount.feePercentage).toBe(0.05);
    });
  });
});