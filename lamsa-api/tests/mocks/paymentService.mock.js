/**
 * Mock Payment Service
 * Simulates payment gateway integration for testing
 */

class MockPaymentService {
  constructor() {
    this.payments = new Map();
    this.failureRate = 0; // 0-1, probability of payment failure
    this.latency = 100; // Mock latency in milliseconds
  }

  /**
   * Set failure rate for testing error scenarios
   */
  setFailureRate(rate) {
    this.failureRate = Math.max(0, Math.min(1, rate));
  }

  /**
   * Set mock latency for performance testing
   */
  setLatency(ms) {
    this.latency = Math.max(0, ms);
  }

  /**
   * Process payment
   */
  async processPayment(paymentData) {
    await this.simulateLatency();

    // Simulate random failures based on failure rate
    if (Math.random() < this.failureRate) {
      throw new PaymentError('Payment processing failed', 'PAYMENT_DECLINED');
    }

    const payment = {
      id: this.generatePaymentId(),
      amount: paymentData.amount,
      currency: paymentData.currency || 'JOD',
      paymentMethod: paymentData.method,
      status: 'completed',
      transactionId: this.generateTransactionId(),
      processedAt: new Date().toISOString(),
      fees: this.calculateFees(paymentData.amount, paymentData.method),
      metadata: paymentData.metadata || {}
    };

    this.payments.set(payment.id, payment);
    return payment;
  }

  /**
   * Process refund
   */
  async processRefund(paymentId, amount, reason) {
    await this.simulateLatency();

    const originalPayment = this.payments.get(paymentId);
    if (!originalPayment) {
      throw new PaymentError('Original payment not found', 'PAYMENT_NOT_FOUND');
    }

    if (amount > originalPayment.amount) {
      throw new PaymentError('Refund amount exceeds original payment', 'INVALID_REFUND_AMOUNT');
    }

    // Simulate refund failure for testing
    if (Math.random() < this.failureRate) {
      throw new PaymentError('Refund processing failed', 'REFUND_FAILED');
    }

    const refund = {
      id: this.generatePaymentId(),
      originalPaymentId: paymentId,
      amount: amount,
      currency: originalPayment.currency,
      status: 'completed',
      reason: reason,
      transactionId: this.generateTransactionId(),
      processedAt: new Date().toISOString(),
      fees: this.calculateRefundFees(amount)
    };

    return refund;
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId) {
    await this.simulateLatency();

    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new PaymentError('Payment not found', 'PAYMENT_NOT_FOUND');
    }

    return {
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      processedAt: payment.processedAt
    };
  }

  /**
   * Validate payment method
   */
  async validatePaymentMethod(method, details) {
    await this.simulateLatency();

    const validMethods = ['cash', 'card', 'online'];
    if (!validMethods.includes(method)) {
      throw new PaymentError('Invalid payment method', 'INVALID_PAYMENT_METHOD');
    }

    if (method === 'card' && details) {
      // Simulate card validation
      if (!details.cardNumber || details.cardNumber.length < 16) {
        throw new PaymentError('Invalid card number', 'INVALID_CARD');
      }
      
      if (!details.expiryDate || !details.cvv) {
        throw new PaymentError('Missing card details', 'INVALID_CARD_DETAILS');
      }
    }

    return { valid: true, method };
  }

  /**
   * Calculate processing fees
   */
  calculateFees(amount, method) {
    const fees = {
      processing: 0,
      gateway: 0,
      total: 0
    };

    switch (method) {
      case 'online':
        fees.processing = amount * 0.025; // 2.5%
        fees.gateway = 0.50; // Fixed gateway fee
        break;
      case 'card':
        fees.processing = amount * 0.02; // 2%
        fees.gateway = 0.30;
        break;
      case 'cash':
        // No processing fees for cash
        break;
    }

    fees.total = fees.processing + fees.gateway;
    return fees;
  }

  /**
   * Calculate refund fees
   */
  calculateRefundFees(amount) {
    return {
      processing: 2.00, // Fixed refund processing fee
      gateway: 0,
      total: 2.00
    };
  }

  /**
   * Generate mock payment ID
   */
  generatePaymentId() {
    return `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate mock transaction ID
   */
  generateTransactionId() {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Simulate network latency
   */
  async simulateLatency() {
    if (this.latency > 0) {
      await new Promise(resolve => setTimeout(resolve, this.latency));
    }
  }

  /**
   * Reset mock state
   */
  reset() {
    this.payments.clear();
    this.failureRate = 0;
    this.latency = 100;
  }

  /**
   * Get all payments (for testing)
   */
  getAllPayments() {
    return Array.from(this.payments.values());
  }

  /**
   * Set specific payment status (for testing scenarios)
   */
  setPaymentStatus(paymentId, status) {
    const payment = this.payments.get(paymentId);
    if (payment) {
      payment.status = status;
    }
  }
}

class PaymentError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
    this.name = 'PaymentError';
  }
}

// Export singleton instance
const mockPaymentService = new MockPaymentService();

// Mock different payment scenarios
mockPaymentService.scenarios = {
  /**
   * Successful payment scenario
   */
  success: () => {
    mockPaymentService.setFailureRate(0);
    mockPaymentService.setLatency(100);
  },

  /**
   * Payment failure scenario
   */
  failure: () => {
    mockPaymentService.setFailureRate(1);
    mockPaymentService.setLatency(100);
  },

  /**
   * Intermittent failures scenario
   */
  intermittent: () => {
    mockPaymentService.setFailureRate(0.3);
    mockPaymentService.setLatency(150);
  },

  /**
   * High latency scenario
   */
  slowNetwork: () => {
    mockPaymentService.setFailureRate(0.1);
    mockPaymentService.setLatency(3000);
  },

  /**
   * Reset to default scenario
   */
  reset: () => {
    mockPaymentService.reset();
  }
};

module.exports = {
  MockPaymentService,
  PaymentError,
  mockPaymentService
};