/**
 * Mock Email Service
 * Simulates email service for testing notifications and communications
 */

class MockEmailService {
  constructor() {
    this.sentEmails = [];
    this.failureRate = 0;
    this.latency = 200;
    this.deliveryRate = 0.98;
    this.bounceRate = 0.02;
  }

  /**
   * Set failure rate for testing error scenarios
   */
  setFailureRate(rate) {
    this.failureRate = Math.max(0, Math.min(1, rate));
  }

  /**
   * Set delivery rate
   */
  setDeliveryRate(rate) {
    this.deliveryRate = Math.max(0, Math.min(1, rate));
  }

  /**
   * Set bounce rate
   */
  setBounceRate(rate) {
    this.bounceRate = Math.max(0, Math.min(1, rate));
  }

  /**
   * Set mock latency
   */
  setLatency(ms) {
    this.latency = Math.max(0, ms);
  }

  /**
   * Send email
   */
  async sendEmail(emailData) {
    await this.simulateLatency();

    // Validate email data
    this.validateEmailData(emailData);

    // Simulate sending failures
    if (Math.random() < this.failureRate) {
      throw new EmailError('Failed to send email', 'SEND_FAILED');
    }

    const emailRecord = {
      id: this.generateEmailId(),
      to: emailData.to,
      cc: emailData.cc || [],
      bcc: emailData.bcc || [],
      subject: emailData.subject,
      body: emailData.body,
      html: emailData.html,
      attachments: emailData.attachments || [],
      status: 'sent',
      sentAt: new Date().toISOString(),
      deliveredAt: null,
      openedAt: null,
      clickedAt: null,
      bouncedAt: null,
      type: emailData.type || 'notification',
      priority: emailData.priority || 'normal',
      metadata: emailData.metadata || {}
    };

    this.sentEmails.push(emailRecord);

    // Simulate delivery/bounce with delay
    setTimeout(() => {
      this.simulateDelivery(emailRecord.id);
    }, this.latency * 2);

    return {
      emailId: emailRecord.id,
      status: 'sent'
    };
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmail(recipients, emailTemplate, options = {}) {
    await this.simulateLatency();

    const results = [];

    for (const recipient of recipients) {
      try {
        const emailData = {
          to: recipient.email,
          subject: this.formatTemplate(emailTemplate.subject, recipient.data),
          body: this.formatTemplate(emailTemplate.body, recipient.data),
          html: emailTemplate.html ? this.formatTemplate(emailTemplate.html, recipient.data) : null,
          type: options.type || 'bulk',
          metadata: { ...options.metadata, recipientId: recipient.id }
        };

        const result = await this.sendEmail(emailData);
        results.push({
          recipient: recipient.email,
          success: true,
          emailId: result.emailId
        });
      } catch (error) {
        results.push({
          recipient: recipient.email,
          success: false,
          error: error.message,
          code: error.code
        });
      }
    }

    return {
      total: recipients.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results: results
    };
  }

  /**
   * Send booking notification email
   */
  async sendBookingNotification(emailData, notificationType) {
    const templates = this.getEmailTemplates();
    const template = templates[notificationType];
    
    if (!template) {
      throw new EmailError('Invalid email template type', 'INVALID_TEMPLATE');
    }

    const formattedEmail = {
      to: emailData.email,
      subject: this.formatTemplate(template.subject, emailData),
      body: this.formatTemplate(template.body, emailData),
      html: this.formatTemplate(template.html, emailData),
      type: 'booking_notification',
      priority: notificationType.includes('reminder') ? 'high' : 'normal',
      metadata: {
        bookingId: emailData.bookingId,
        notificationType: notificationType
      }
    };

    return await this.sendEmail(formattedEmail);
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(userData) {
    const template = this.getEmailTemplates().welcome;
    
    const emailData = {
      to: userData.email,
      subject: this.formatTemplate(template.subject, userData),
      body: this.formatTemplate(template.body, userData),
      html: this.formatTemplate(template.html, userData),
      type: 'welcome',
      priority: 'normal'
    };

    return await this.sendEmail(emailData);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(userData, resetToken) {
    const template = this.getEmailTemplates().password_reset;
    const data = { ...userData, resetToken, resetUrl: `https://app.beautycort.com/reset?token=${resetToken}` };
    
    const emailData = {
      to: userData.email,
      subject: this.formatTemplate(template.subject, data),
      body: this.formatTemplate(template.body, data),
      html: this.formatTemplate(template.html, data),
      type: 'password_reset',
      priority: 'high'
    };

    return await this.sendEmail(emailData);
  }

  /**
   * Send invoice email
   */
  async sendInvoice(invoiceData) {
    const template = this.getEmailTemplates().invoice;
    
    const emailData = {
      to: invoiceData.customerEmail,
      subject: this.formatTemplate(template.subject, invoiceData),
      body: this.formatTemplate(template.body, invoiceData),
      html: this.formatTemplate(template.html, invoiceData),
      attachments: invoiceData.pdfAttachment ? [invoiceData.pdfAttachment] : [],
      type: 'invoice',
      priority: 'normal',
      metadata: {
        bookingId: invoiceData.bookingId,
        amount: invoiceData.amount
      }
    };

    return await this.sendEmail(emailData);
  }

  /**
   * Get email status
   */
  async getEmailStatus(emailId) {
    await this.simulateLatency();

    const email = this.sentEmails.find(e => e.id === emailId);
    if (!email) {
      throw new EmailError('Email not found', 'EMAIL_NOT_FOUND');
    }

    return {
      id: email.id,
      status: email.status,
      sentAt: email.sentAt,
      deliveredAt: email.deliveredAt,
      openedAt: email.openedAt,
      clickedAt: email.clickedAt,
      bouncedAt: email.bouncedAt,
      to: email.to
    };
  }

  /**
   * Validate email data
   */
  validateEmailData(emailData) {
    if (!emailData.to) {
      throw new EmailError('Recipient email is required', 'MISSING_RECIPIENT');
    }

    if (!this.isValidEmail(emailData.to)) {
      throw new EmailError('Invalid recipient email format', 'INVALID_EMAIL');
    }

    if (!emailData.subject) {
      throw new EmailError('Email subject is required', 'MISSING_SUBJECT');
    }

    if (!emailData.body && !emailData.html) {
      throw new EmailError('Email body or HTML content is required', 'MISSING_CONTENT');
    }
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get email templates
   */
  getEmailTemplates() {
    return {
      booking_created: {
        subject: 'Booking Confirmation - {serviceName} at {providerName}',
        body: `Dear {customerName},

Your booking has been created successfully!

Service: {serviceName}
Provider: {providerName}
Date: {bookingDate}
Time: {startTime}
Amount: {amount} JOD
Booking ID: {bookingId}

Please arrive 5 minutes before your appointment time.

Best regards,
BeautyCort Team`,
        html: `<h2>Booking Confirmation</h2>
<p>Dear {customerName},</p>
<p>Your booking has been created successfully!</p>
<div style="border: 1px solid #ddd; padding: 15px; margin: 15px 0;">
  <strong>Service:</strong> {serviceName}<br>
  <strong>Provider:</strong> {providerName}<br>
  <strong>Date:</strong> {bookingDate}<br>
  <strong>Time:</strong> {startTime}<br>
  <strong>Amount:</strong> {amount} JOD<br>
  <strong>Booking ID:</strong> {bookingId}
</div>
<p>Please arrive 5 minutes before your appointment time.</p>
<p>Best regards,<br>BeautyCort Team</p>`
      },

      booking_confirmed: {
        subject: 'Booking Confirmed - {serviceName}',
        body: `Dear {customerName},

Your booking has been confirmed by the provider!

Service: {serviceName}
Provider: {providerName}
Date: {bookingDate}
Time: {startTime}

We look forward to serving you.

Best regards,
BeautyCort Team`,
        html: `<h2>Booking Confirmed</h2>
<p>Dear {customerName},</p>
<p>Your booking has been confirmed by the provider!</p>
<div style="border: 1px solid #28a745; padding: 15px; margin: 15px 0; background-color: #f8f9fa;">
  <strong>Service:</strong> {serviceName}<br>
  <strong>Provider:</strong> {providerName}<br>
  <strong>Date:</strong> {bookingDate}<br>
  <strong>Time:</strong> {startTime}
</div>
<p>We look forward to serving you.</p>
<p>Best regards,<br>BeautyCort Team</p>`
      },

      booking_cancelled: {
        subject: 'Booking Cancelled - {serviceName}',
        body: `Dear {customerName},

Your booking has been cancelled.

Service: {serviceName}
Provider: {providerName}
Original Date: {bookingDate}
Original Time: {startTime}
Reason: {reason}

If payment was made, refund will be processed according to our policy.

Best regards,
BeautyCort Team`,
        html: `<h2>Booking Cancelled</h2>
<p>Dear {customerName},</p>
<p>Your booking has been cancelled.</p>
<div style="border: 1px solid #dc3545; padding: 15px; margin: 15px 0; background-color: #f8f9fa;">
  <strong>Service:</strong> {serviceName}<br>
  <strong>Provider:</strong> {providerName}<br>
  <strong>Original Date:</strong> {bookingDate}<br>
  <strong>Original Time:</strong> {startTime}<br>
  <strong>Reason:</strong> {reason}
</div>
<p>If payment was made, refund will be processed according to our policy.</p>
<p>Best regards,<br>BeautyCort Team</p>`
      },

      reminder_24h: {
        subject: 'Appointment Reminder - Tomorrow at {startTime}',
        body: `Dear {customerName},

This is a reminder that you have an appointment tomorrow:

Service: {serviceName}
Provider: {providerName}
Date: {bookingDate}
Time: {startTime}
Address: {providerAddress}

Please arrive 5 minutes early.

Best regards,
BeautyCort Team`,
        html: `<h2>Appointment Reminder</h2>
<p>Dear {customerName},</p>
<p>This is a reminder that you have an appointment tomorrow:</p>
<div style="border: 1px solid #007bff; padding: 15px; margin: 15px 0; background-color: #f8f9fa;">
  <strong>Service:</strong> {serviceName}<br>
  <strong>Provider:</strong> {providerName}<br>
  <strong>Date:</strong> {bookingDate}<br>
  <strong>Time:</strong> {startTime}<br>
  <strong>Address:</strong> {providerAddress}
</div>
<p>Please arrive 5 minutes early.</p>
<p>Best regards,<br>BeautyCort Team</p>`
      },

      welcome: {
        subject: 'Welcome to BeautyCort!',
        body: `Dear {name},

Welcome to BeautyCort, Jordan's premier beauty booking platform!

You can now:
- Browse and book beauty services
- Manage your appointments
- Leave reviews for providers
- Track your booking history

Download our mobile app for the best experience.

Best regards,
BeautyCort Team`,
        html: `<h1>Welcome to BeautyCort!</h1>
<p>Dear {name},</p>
<p>Welcome to BeautyCort, Jordan's premier beauty booking platform!</p>
<h3>You can now:</h3>
<ul>
  <li>Browse and book beauty services</li>
  <li>Manage your appointments</li>
  <li>Leave reviews for providers</li>
  <li>Track your booking history</li>
</ul>
<p>Download our mobile app for the best experience.</p>
<p>Best regards,<br>BeautyCort Team</p>`
      },

      password_reset: {
        subject: 'Reset Your BeautyCort Password',
        body: `Dear {name},

You requested to reset your password for your BeautyCort account.

Click the link below to reset your password:
{resetUrl}

This link will expire in 1 hour.

If you didn't request this, please ignore this email.

Best regards,
BeautyCort Team`,
        html: `<h2>Reset Your Password</h2>
<p>Dear {name},</p>
<p>You requested to reset your password for your BeautyCort account.</p>
<p><a href="{resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
<p>This link will expire in 1 hour.</p>
<p>If you didn't request this, please ignore this email.</p>
<p>Best regards,<br>BeautyCort Team</p>`
      },

      invoice: {
        subject: 'Invoice for Booking #{bookingId}',
        body: `Dear {customerName},

Please find attached the invoice for your recent booking.

Booking Details:
- Service: {serviceName}
- Provider: {providerName}
- Date: {bookingDate}
- Amount: {amount} JOD

Thank you for choosing BeautyCort.

Best regards,
BeautyCort Team`,
        html: `<h2>Invoice</h2>
<p>Dear {customerName},</p>
<p>Please find attached the invoice for your recent booking.</p>
<div style="border: 1px solid #ddd; padding: 15px; margin: 15px 0;">
  <h3>Booking Details:</h3>
  <strong>Service:</strong> {serviceName}<br>
  <strong>Provider:</strong> {providerName}<br>
  <strong>Date:</strong> {bookingDate}<br>
  <strong>Amount:</strong> {amount} JOD
</div>
<p>Thank you for choosing BeautyCort.</p>
<p>Best regards,<br>BeautyCort Team</p>`
      }
    };
  }

  /**
   * Format template with data
   */
  formatTemplate(template, data) {
    let formatted = template;
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{${key}}`, 'g');
      formatted = formatted.replace(regex, value || '');
    });
    return formatted;
  }

  /**
   * Simulate email delivery/bounce
   */
  simulateDelivery(emailId) {
    const email = this.sentEmails.find(e => e.id === emailId);
    if (email && email.status === 'sent') {
      if (Math.random() < this.bounceRate) {
        // Email bounced
        email.status = 'bounced';
        email.bouncedAt = new Date().toISOString();
      } else if (Math.random() < this.deliveryRate) {
        // Email delivered
        email.status = 'delivered';
        email.deliveredAt = new Date().toISOString();
        
        // Simulate email opening (30% open rate)
        if (Math.random() < 0.3) {
          setTimeout(() => {
            email.openedAt = new Date().toISOString();
            
            // Simulate link clicking (10% of opened emails)
            if (Math.random() < 0.1) {
              setTimeout(() => {
                email.clickedAt = new Date().toISOString();
              }, Math.random() * 3600000); // Within 1 hour
            }
          }, Math.random() * 86400000); // Within 24 hours
        }
      } else {
        // Email failed
        email.status = 'failed';
      }
    }
  }

  /**
   * Generate email ID
   */
  generateEmailId() {
    return `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    this.sentEmails = [];
    this.failureRate = 0;
    this.latency = 200;
    this.deliveryRate = 0.98;
    this.bounceRate = 0.02;
  }

  /**
   * Get all sent emails (for testing)
   */
  getAllEmails() {
    return [...this.sentEmails];
  }

  /**
   * Get emails by type
   */
  getEmailsByType(type) {
    return this.sentEmails.filter(e => e.type === type);
  }

  /**
   * Get emails by recipient
   */
  getEmailsByRecipient(email) {
    return this.sentEmails.filter(e => e.to === email);
  }

  /**
   * Get email statistics
   */
  getEmailStats() {
    const total = this.sentEmails.length;
    const delivered = this.sentEmails.filter(e => e.status === 'delivered').length;
    const bounced = this.sentEmails.filter(e => e.status === 'bounced').length;
    const failed = this.sentEmails.filter(e => e.status === 'failed').length;
    const opened = this.sentEmails.filter(e => e.openedAt).length;
    const clicked = this.sentEmails.filter(e => e.clickedAt).length;

    return {
      total,
      delivered,
      bounced,
      failed,
      opened,
      clicked,
      deliveryRate: total > 0 ? delivered / total : 0,
      bounceRate: total > 0 ? bounced / total : 0,
      openRate: delivered > 0 ? opened / delivered : 0,
      clickRate: opened > 0 ? clicked / opened : 0
    };
  }
}

class EmailError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
    this.name = 'EmailError';
  }
}

// Export singleton instance
const mockEmailService = new MockEmailService();

// Mock different email scenarios
mockEmailService.scenarios = {
  /**
   * High delivery rate scenario
   */
  highDelivery: () => {
    mockEmailService.setFailureRate(0);
    mockEmailService.setDeliveryRate(0.99);
    mockEmailService.setBounceRate(0.01);
    mockEmailService.setLatency(200);
  },

  /**
   * High bounce rate scenario
   */
  highBounce: () => {
    mockEmailService.setFailureRate(0.05);
    mockEmailService.setDeliveryRate(0.8);
    mockEmailService.setBounceRate(0.15);
    mockEmailService.setLatency(300);
  },

  /**
   * Service issues scenario
   */
  serviceIssues: () => {
    mockEmailService.setFailureRate(0.3);
    mockEmailService.setDeliveryRate(0.6);
    mockEmailService.setBounceRate(0.1);
    mockEmailService.setLatency(2000);
  },

  /**
   * Normal operation scenario
   */
  normal: () => {
    mockEmailService.setFailureRate(0.01);
    mockEmailService.setDeliveryRate(0.98);
    mockEmailService.setBounceRate(0.02);
    mockEmailService.setLatency(200);
  },

  /**
   * Reset to default scenario
   */
  reset: () => {
    mockEmailService.reset();
  }
};

module.exports = {
  MockEmailService,
  EmailError,
  mockEmailService
};