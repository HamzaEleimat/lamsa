/**
 * Blunet SMS Service
 * Handles SMS sending via Blunet SMS Gateway for Jordan
 */

import axios from 'axios';
import { logger } from '../utils/logger';

export interface BlunetSMSConfig {
  baseUrl: string;
  port: string;
  username: string;
  password: string;
  senderId: string;
  accessKey?: string; // Optional: Can use accesskey instead of username/password
}

export interface BlunetSMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
}

export interface BlunetMessageType {
  ENGLISH: 1;
  UNICODE: 2;
  SPECIAL_CHAR: 3;
  ARABIC: 4;
}

export class BlunetSMSService {
  private static instance: BlunetSMSService;
  private config: BlunetSMSConfig | null = null;
  
  // Message type constants
  public static readonly MESSAGE_TYPE: BlunetMessageType = {
    ENGLISH: 1,
    UNICODE: 2,
    SPECIAL_CHAR: 3,
    ARABIC: 4
  };

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): BlunetSMSService {
    if (!BlunetSMSService.instance) {
      BlunetSMSService.instance = new BlunetSMSService();
    }
    return BlunetSMSService.instance;
  }

  /**
   * Initialize Blunet configuration
   */
  initialize(config: BlunetSMSConfig): void {
    this.config = config;
    logger.info('Blunet SMS service initialized', {
      baseUrl: config.baseUrl,
      port: config.port,
      senderId: config.senderId
    });
  }

  /**
   * Get configuration from environment
   */
  private getConfig(): BlunetSMSConfig {
    if (!this.config) {
      this.config = {
        baseUrl: process.env.BLUNET_BASE_URL || '82.212.81.40',
        port: process.env.BLUNET_PORT || '8080',
        username: process.env.BLUNET_USERNAME || '',
        password: process.env.BLUNET_PASSWORD || '',
        senderId: process.env.BLUNET_SENDER_ID || 'LAMSA',
        accessKey: process.env.BLUNET_ACCESS_KEY
      };
    }
    return this.config;
  }

  /**
   * Detect message type based on content
   */
  private detectMessageType(text: string): number {
    // Check for Arabic characters
    const arabicRegex = /[\u0600-\u06FF\u0750-\u077F]/;
    if (arabicRegex.test(text)) {
      return BlunetSMSService.MESSAGE_TYPE.ARABIC;
    }

    // Check for special characters
    const specialChars = /[$@#%&*()]/;
    if (specialChars.test(text)) {
      return BlunetSMSService.MESSAGE_TYPE.SPECIAL_CHAR;
    }

    // Check if it needs Unicode (non-ASCII)
    const nonAscii = /[^\x00-\x7F]/;
    if (nonAscii.test(text)) {
      return BlunetSMSService.MESSAGE_TYPE.UNICODE;
    }

    // Default to English
    return BlunetSMSService.MESSAGE_TYPE.ENGLISH;
  }

  /**
   * Format phone number for Blunet (Jordan format)
   */
  private formatPhoneNumber(phone: string): string {
    // Remove any non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // If already in international format with 962
    if (cleaned.startsWith('+962')) {
      return cleaned.substring(1); // Remove the + sign for Blunet
    }
    
    if (cleaned.startsWith('962')) {
      return cleaned;
    }
    
    // Local format starting with 07
    if (cleaned.startsWith('07')) {
      return '962' + cleaned.substring(1);
    }
    
    // Local format starting with 7
    if (cleaned.startsWith('7') && cleaned.length === 9) {
      return '962' + cleaned;
    }
    
    // Assume it's already formatted correctly
    return cleaned;
  }

  /**
   * Send SMS via Blunet
   */
  async sendSMS(
    phone: string,
    message: string,
    options?: {
      messageType?: number;
      scheduleTime?: string; // Format: yyyyMMddhhmm
      gmt?: string; // e.g., '+0300' for Jordan
    }
  ): Promise<BlunetSMSResponse> {
    try {
      const config = this.getConfig();
      
      if (!config.username && !config.accessKey) {
        logger.error('Blunet credentials not configured');
        return {
          success: false,
          error: 'SMS service not configured',
          errorCode: 'CONFIG_ERROR'
        };
      }

      // Format phone number
      const formattedPhone = this.formatPhoneNumber(phone);
      
      // Detect message type if not provided
      const messageType = options?.messageType || this.detectMessageType(message);
      
      // Build URL
      const baseUrl = `http://${config.baseUrl}:${config.port}/websmpp/websms`;
      
      // Build parameters
      const params: any = {
        sid: config.senderId,
        mno: formattedPhone,
        type: messageType,
        text: message
      };

      // Add authentication
      if (config.accessKey) {
        params.accesskey = config.accessKey;
      } else {
        params.user = config.username;
        params.pass = config.password;
      }

      // Add scheduling if provided
      if (options?.scheduleTime) {
        params.schtime = options.scheduleTime;
        params.gmt = options.gmt || '+0300'; // Jordan timezone
      }

      // Make request
      logger.info('Sending SMS via Blunet', {
        phone: formattedPhone,
        messageType,
        senderId: config.senderId,
        messageLength: message.length
      });

      const response = await axios.get(baseUrl, {
        params,
        timeout: 30000 // 30 seconds timeout
      });

      // Parse response
      const responseText = response.data.toString();
      
      // Check for successful response (should be a message ID)
      if (responseText.startsWith('Response:')) {
        const messageId = responseText.replace('Response:', '').trim();
        
        logger.info('SMS sent successfully via Blunet', {
          messageId,
          phone: formattedPhone
        });
        
        return {
          success: true,
          messageId
        };
      }
      
      // Check for error response
      if (responseText.startsWith('ERROR')) {
        const errorMatch = responseText.match(/ERROR - (HTTP\d+) --> (.+)/);
        const errorCode = errorMatch ? errorMatch[1] : 'UNKNOWN';
        const errorMessage = errorMatch ? errorMatch[2] : responseText;
        
        logger.error('Blunet SMS error', {
          errorCode,
          errorMessage,
          phone: formattedPhone
        });
        
        return {
          success: false,
          error: errorMessage,
          errorCode
        };
      }

      // Unexpected response format
      logger.error('Unexpected Blunet response', {
        response: responseText,
        phone: formattedPhone
      });
      
      return {
        success: false,
        error: 'Unexpected response from SMS provider',
        errorCode: 'INVALID_RESPONSE'
      };

    } catch (error) {
      logger.error('Blunet SMS exception', {
        error: error instanceof Error ? error.message : 'Unknown error',
        phone
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SMS sending failed',
        errorCode: 'EXCEPTION'
      };
    }
  }

  /**
   * Check SMS delivery status
   */
  async checkStatus(messageId: string): Promise<{
    status: string;
    description: string;
  }> {
    try {
      const config = this.getConfig();
      const baseUrl = `http://${config.baseUrl}:${config.port}/websmpp/websmsstatus`;
      
      const response = await axios.get(baseUrl, {
        params: {
          respid: messageId
        },
        timeout: 10000
      });

      const status = response.data.toString().trim();
      
      // Map Blunet status codes to descriptions
      const statusMap: { [key: string]: string } = {
        'ATES': 'Pending',
        'DELIVRD': 'Delivered',
        'UNDELIV': 'Undelivered',
        'EXPIRED': 'Message Validity Period Expired',
        'REJECTD': 'Rejected',
        'ACCEPTD': 'Accepted',
        'DELETED': 'Deleted',
        'UNKNOWN': 'Unknown'
      };

      return {
        status,
        description: statusMap[status] || 'Unknown status'
      };

    } catch (error) {
      logger.error('Error checking SMS status', {
        messageId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        status: 'ERROR',
        description: 'Failed to check status'
      };
    }
  }

  /**
   * Check account balance
   */
  async checkBalance(): Promise<{
    success: boolean;
    balance?: number;
    error?: string;
  }> {
    try {
      const config = this.getConfig();
      const baseUrl = `http://${config.baseUrl}:${config.port}/websmpp/balanceReport`;
      
      const params: any = {};
      
      if (config.accessKey) {
        params.accesskey = config.accessKey;
      } else {
        params.userid = config.username;
        params.password = config.password;
      }

      const response = await axios.get(baseUrl, {
        params,
        timeout: 10000
      });

      const responseText = response.data.toString();
      
      // Parse balance from response
      // Note: Response format may vary, adjust parsing as needed
      const balance = parseFloat(responseText);
      
      if (!isNaN(balance)) {
        return {
          success: true,
          balance
        };
      }

      return {
        success: false,
        error: 'Invalid balance response'
      };

    } catch (error) {
      logger.error('Error checking balance', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Balance check failed'
      };
    }
  }

  /**
   * Validate configuration
   */
  isConfigured(): boolean {
    const config = this.getConfig();
    return !!(
      config.baseUrl &&
      config.port &&
      (config.accessKey || (config.username && config.password)) &&
      config.senderId
    );
  }
}

// Export singleton instance
export const blunetSMSService = BlunetSMSService.getInstance();