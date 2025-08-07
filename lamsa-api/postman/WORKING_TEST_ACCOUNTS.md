# Working Test Accounts for Postman

## Provider Account (Confirmed Working)

Use this account for provider login testing:

```json
{
  "email": "provider@example.com",
  "password": "Provider123!"
}
```

### Account Details:
- **Email**: provider@example.com
- **Password**: Provider123!
- **Phone**: 0795555555
- **Business Name**: Example Salon
- **Status**: Active
- **Email Confirmed**: Yes

### How to Use in Postman:

1. **Provider Login Endpoint**: `POST {{base_url}}/api/auth/provider/login`
2. **Headers**: 
   - Content-Type: application/json
3. **Body** (raw JSON):
```json
{
  "email": "provider@example.com",
  "password": "Provider123!"
}
```

## Known Issues

1. **API Login May Fail**: Even though the account is valid, the API login endpoint might return "Invalid email or password". This is a known issue being investigated.

2. **Direct Supabase Login Works**: The account has been verified to work with direct Supabase authentication.

## Testing Direct Login

To verify the account works:
```bash
cd lamsa-api
npx ts-node test-direct-supabase-login.ts provider@example.com Provider123!
```

## Creating New Test Accounts

If you need to create additional test accounts:
```bash
cd lamsa-api
npx ts-node create-working-provider.ts
```

Then update the email/phone in the script to avoid duplicates.