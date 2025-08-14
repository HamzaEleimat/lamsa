import { Request, Response, NextFunction } from 'express';
import { encryptionService } from '../services/encryption.service';

/**
 * Middleware to handle PII encryption/decryption automatically
 */

/**
 * Encrypt PII fields in request body before saving to database
 */
export function encryptPIIRequest(fields: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.body && encryptionService.isEnabled()) {
      req.body = encryptionService.encryptFields(req.body, fields);
    }
    next();
  };
}

/**
 * Decrypt PII fields in response data
 */
export function decryptPIIResponse(fields: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!encryptionService.isEnabled()) {
      return next();
    }

    // Override res.json to decrypt data before sending
    const originalJson = res.json.bind(res);
    
    res.json = function(data: any) {
      if (data && typeof data === 'object') {
        // Handle single object
        if (data.data && !Array.isArray(data.data)) {
          data.data = encryptionService.decryptFields(data.data, fields);
        }
        // Handle array of objects
        else if (data.data && Array.isArray(data.data)) {
          data.data = data.data.map((item: any) => 
            encryptionService.decryptFields(item, fields)
          );
        }
        // Handle direct object response
        else if (!data.success && !data.error) {
          data = encryptionService.decryptFields(data, fields);
        }
      }
      
      return originalJson(data);
    };
    
    next();
  };
}

/**
 * Encrypt provider PII before saving
 */
export function encryptProviderPII(req: Request, _res: Response, next: NextFunction) {
  if (req.body && encryptionService.isEnabled()) {
    // Handle provider creation/update
    if (req.body.phone || req.body.email || req.body.owner_name) {
      req.body = encryptionService.encryptProviderPII(req.body);
    }
  }
  next();
}

/**
 * Decrypt provider PII in responses
 */
export function decryptProviderPII(_req: Request, res: Response, next: NextFunction) {
  if (!encryptionService.isEnabled()) {
    return next();
  }

  const originalJson = res.json.bind(res);
  
  res.json = function(data: any) {
    if (data && typeof data === 'object') {
      // Handle single provider
      if (data.data && !Array.isArray(data.data) && data.data.pii_encrypted) {
        data.data = encryptionService.decryptProviderPII(data.data);
      }
      // Handle array of providers
      else if (data.data && Array.isArray(data.data)) {
        data.data = data.data.map((item: any) => 
          item.pii_encrypted ? encryptionService.decryptProviderPII(item) : item
        );
      }
      // Handle direct provider response
      else if (data.pii_encrypted) {
        data = encryptionService.decryptProviderPII(data);
      }
    }
    
    return originalJson(data);
  };
  
  next();
}

/**
 * Hash phone/email for searching encrypted fields
 */
export function hashSearchFields(fields: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!encryptionService.isEnabled()) {
      return next();
    }

    // Hash query parameters for searching
    for (const field of fields) {
      if (req.query[field]) {
        const hashValue = encryptionService.hash(req.query[field] as string);
        if (hashValue !== null) {
          req.query[`${field}_hash`] = hashValue;
        }
      }
      if (req.body && req.body[field]) {
        const hashValue = encryptionService.hash(req.body[field]);
        if (hashValue !== null) {
          req.body[`${field}_hash`] = hashValue;
        }
      }
    }
    
    next();
  };
}

/**
 * Middleware to check if PII encryption is enabled
 */
export function requireEncryption(_req: Request, res: Response, next: NextFunction): void {
  if (!encryptionService.isEnabled()) {
    console.warn('PII encryption is not enabled. This is a security risk in production.');
    
    // In production, we should enforce encryption
    if (process.env.NODE_ENV === 'production') {
      res.status(503).json({
        success: false,
        error: 'SERVICE_UNAVAILABLE',
        message: 'PII encryption is required but not configured'
      });
      return;
    }
  }
  
  next();
}

/**
 * Log PII access for audit purposes
 */
export function auditPIIAccess(action: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (user) {
      console.log(`PII Access Audit: User ${user.id} (${user.role}) performed ${action} at ${new Date().toISOString()}`);
      
      // TODO: Store in audit log table
      // await supabase.from('pii_audit_log').insert({
      //   user_id: user.id,
      //   user_role: user.role,
      //   action,
      //   resource_type: req.baseUrl,
      //   resource_id: req.params.id,
      //   ip_address: req.ip,
      //   user_agent: req.get('user-agent'),
      //   timestamp: new Date().toISOString()
      // });
    }
    
    next();
  };
}