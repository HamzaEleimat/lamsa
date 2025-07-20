# PII Encryption Guide

## Overview

Lamsa implements field-level encryption for Personally Identifiable Information (PII) to protect sensitive user data at rest. This guide explains how to set up and manage PII encryption.

## Encrypted Fields

The following fields are automatically encrypted:

### Users Table
- `name` - Customer's full name
- `email` - Customer's email address

### Providers Table
- `owner_name` - Business owner's name
- `email` - Provider's email address
- `phone` - Provider's phone number
- `address` - Business address (JSON)
- `bank_account_number` - Banking details

### Bookings Table
- `customer_notes` - Private customer notes
- `provider_notes` - Private provider notes

### Reviews Table
- `comment` - Review text content

### Payments Table
- `card_last_four` - Last 4 digits of card
- `receipt_url` - Payment receipt URLs

## Setup Instructions

### 1. Generate Encryption Key

```bash
npm run migrate:pii generate-key
```

This will output a base64-encoded 256-bit key:
```
PII_ENCRYPTION_KEY="your-generated-key-here"
```

### 2. Configure Environment

Add the key to your `.env` file:
```env
# PII Encryption
PII_ENCRYPTION_KEY="your-generated-key-here"
PII_HASH_SALT="unique-salt-for-your-app"
```

### 3. Run Database Migration

Apply the database schema changes:
```bash
npm run migrate
```

### 4. Encrypt Existing Data

Check current encryption status:
```bash
npm run migrate:pii status
```

Encrypt all unencrypted PII:
```bash
npm run migrate:pii migrate
```

## Security Best Practices

### Key Management

1. **Never commit encryption keys to version control**
2. **Use different keys for each environment** (dev, staging, prod)
3. **Rotate keys periodically** (recommended: annually)
4. **Store production keys in a Key Management Service (KMS)**:
   - AWS KMS
   - Azure Key Vault
   - Google Cloud KMS
   - HashiCorp Vault

### Key Rotation

To rotate encryption keys:

1. Generate a new key
2. Update the application to support both old and new keys
3. Re-encrypt all data with the new key
4. Remove the old key after verification

### Backup Considerations

- **Always backup encryption keys** separately from database backups
- **Test restore procedures** regularly
- **Document key recovery processes**

## Implementation Details

### Encryption Algorithm

- **Algorithm**: AES-256-GCM (Authenticated Encryption)
- **Key Derivation**: PBKDF2 with per-field salts
- **Authentication**: Built-in with GCM mode
- **Storage Format**: Base64-encoded (salt + iv + tag + ciphertext)

### Search Capabilities

Encrypted fields can still be searched using hash indexes:
- SHA-256 hashes are stored alongside encrypted data
- Exact match searches work normally
- Partial/fuzzy searches are not supported on encrypted fields

### Performance Impact

- **Encryption overhead**: ~2-5ms per field
- **Storage increase**: ~2.5x original size
- **Indexing**: Hash indexes maintain search performance

## API Usage

### Reading Encrypted Data

The API automatically decrypts data for authorized users:

```javascript
// Data is automatically decrypted
const user = await encryptedDb.findUserByPhone('+962791234567');
console.log(user.name); // Decrypted name
```

### Writing Encrypted Data

The API automatically encrypts PII fields:

```javascript
// Data is automatically encrypted before storage
await encryptedDb.createUser({
  name: 'John Doe',        // Will be encrypted
  email: 'john@example.com', // Will be encrypted
  phone: '+962791234567',   // Will be hashed for search
  language: 'en'           // Not encrypted
});
```

### Masked Data for Public APIs

Sensitive data is automatically masked for unauthorized access:

```javascript
// Public provider profile
{
  "email": "j***n@example.com",     // Masked
  "phone": "********4567",           // Masked
  "owner_name": "J***",              // Masked
  "business_name_en": "Beauty Salon" // Not sensitive, not masked
}
```

## Monitoring

### Check Encryption Status

```sql
SELECT * FROM check_pii_encryption_status();
```

### Audit Encryption Events

Security events are logged for:
- Encryption failures
- Decryption attempts
- Key rotation activities

## Troubleshooting

### Common Issues

1. **"Failed to decrypt data"**
   - Check if the encryption key is correct
   - Verify the data was encrypted with the same key

2. **"Invalid encryption key configuration"**
   - Ensure PII_ENCRYPTION_KEY is base64-encoded
   - Check key length (must be 32 bytes/256 bits)

3. **Search not working**
   - Verify hash indexes are created
   - Check if email_hash/phone_hash columns are populated

### Emergency Procedures

If encryption key is lost:
1. **Stop all write operations**
2. **Attempt key recovery** from backups
3. **If unrecoverable**, data in encrypted fields will be permanently lost
4. **Document the incident** and review key management procedures

## Compliance

This encryption implementation helps meet requirements for:
- **GDPR** - Article 32 (Security of Processing)
- **PCI DSS** - Requirement 3.4 (Encryption of stored data)
- **HIPAA** - Technical Safeguards
- **ISO 27001** - A.10 Cryptography

## Future Enhancements

- [ ] Client-side encryption for end-to-end security
- [ ] Hardware Security Module (HSM) integration
- [ ] Transparent Data Encryption (TDE) at database level
- [ ] Field-level access control with encryption
- [ ] Homomorphic encryption for encrypted searches