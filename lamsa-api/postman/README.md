# Lamsa API Postman Collections

This directory contains Postman collections and testing infrastructure for the Lamsa API.

## 📁 Directory Structure

```
postman/
├── collections/              # Organized API collections
│   ├── auth/                # Authentication & setup requests
│   ├── bookings/            # Booking management endpoints
│   ├── providers/           # Provider & service endpoints
│   ├── journeys/            # End-to-end user workflows
│   └── testing/             # Error scenarios & edge cases
├── environments/            # Environment configurations
│   ├── local.postman_environment.json
│   ├── development.postman_environment.json
│   └── staging.postman_environment.json
├── scripts/                 # Automation scripts
│   ├── newman-runner.js     # CLI test runner
│   ├── split-collection.js  # Collection splitter utility
│   └── pre-request/         # Reusable pre-request scripts
│       ├── auth-token-generator.js
│       ├── test-data-generator.js
│       └── jordan-validations.js
├── ci/                      # CI/CD configurations
│   ├── github-workflow.yml
│   ├── gitlab-ci.yml
│   └── jenkins/
│       └── Jenkinsfile
├── test-results/            # Test execution results (gitignored)
└── docs/                    # Additional documentation
```

## 🚀 Quick Start

### Prerequisites
```bash
npm install -g newman
npm install  # Install local dependencies
```

### Running Tests

#### Run all collections:
```bash
node scripts/newman-runner.js --environment local --collection all
```

#### Run specific collection:
```bash
node scripts/newman-runner.js --environment development --collection auth
```

#### List available collections:
```bash
node scripts/newman-runner.js --list
```

#### Run with options:
```bash
# Verbose output with custom timeout
node scripts/newman-runner.js -e staging -c bookings -v -t 60000

# Stop on first failure
node scripts/newman-runner.js -e production -c all --bail

# Custom output directory
node scripts/newman-runner.js -e local -c providers -o ./custom-results
```

## 📚 Collections

### 1. **Auth & Setup** (`auth/`)
- JWT token generation
- Customer/Provider signup
- OTP verification
- Test data setup

**Run first to set up authentication tokens!**

### 2. **Booking Management** (`bookings/`)
- Create bookings
- View booking details
- Update booking status
- Cancel bookings
- Payment processing

### 3. **Provider & Service Management** (`providers/`)
- **NEW**: Provider signup with OTP verification
- **NEW**: Create provider profile (business details, location)
- **NEW**: Update provider profile
- Search providers
- View provider profiles
- List services
- Check availability
- Manage schedules

### 4. **User Journeys** (`journeys/`)
Complete end-to-end workflows:
- Customer booking flow
- **NEW**: Provider complete onboarding (OTP → Signup → Profile → Services)
- Provider onboarding
- Service management
- Review submission

### 5. **Error Scenarios** (`testing/`)
- Invalid inputs
- Authentication failures
- Rate limiting
- Edge cases

## 🌍 Environments

### Local Development
- Base URL: `http://localhost:3000`
- Uses local Supabase instance
- Debug mode enabled

### Development Server
- Base URL: `https://dev-api.welamsa.com`
- Test data available
- Lower rate limits

### Staging
- Base URL: `https://staging-api.welamsa.com`
- Production-like environment
- Higher timeouts for stability

## 🔧 Configuration

### Environment Variables
Each environment file contains:
- `base_url`: API endpoint
- `customer_token`: Auto-generated JWT
- `provider_token`: Auto-generated JWT
- `platform_fee_small`: 2.00 JOD (≤25 JOD services)
- `platform_fee_large`: 5.00 JOD (>25 JOD services)
- **NEW**: `provider_profile_id`: Created provider profile ID
- **NEW**: `provider_latitude/longitude`: Default location (Amman)
- **NEW**: `provider_category`: Default business category
- **NEW**: `test_otp`: Development OTP code

### Pre-request Scripts
Automatically handle:
- JWT token generation
- Test data creation
- Date formatting
- Phone number validation

## 📊 Test Reports

After running tests, find reports in `test-results/`:
- `*-report-*.html`: Interactive HTML report
- `*-results-*.json`: Detailed JSON results
- `*-junit-*.xml`: JUnit format for CI/CD
- `summary-*.json`: Aggregated statistics
- `readable-report-*.txt`: Human-readable summary

## 🔄 CI/CD Integration

### GitHub Actions
```yaml
- uses: ./lamsa-api/postman/ci/github-workflow.yml
```

### GitLab CI
```yaml
include:
  - local: '/lamsa-api/postman/ci/gitlab-ci.yml'
```

### Jenkins
```groovy
load 'lamsa-api/postman/ci/jenkins/Jenkinsfile'
```

## 📝 Writing Tests

### Jordan-specific Validations
```javascript
// In Tests tab
const jordanValidations = pm.environment.get('jordan_validations');
eval(jordanValidations);

// Validate phone number
validateJordanianPhone(pm.response.json().phone);

// Validate currency
validateJODAmount(pm.response.json().price);

// Validate Arabic content
validateArabicContent(pm.response.json().name_ar, 'Service name');
```

### Platform Fee Validation
```javascript
// In Tests tab
const serviceAmount = pm.response.json().service_amount;
const platformFee = pm.response.json().platform_fee;

validatePlatformFees(serviceAmount, platformFee);
```

## 🐛 Troubleshooting

### Common Issues

1. **"CSRF token missing"**
   - Auth endpoints don't need CSRF tokens
   - Other endpoints get tokens automatically

2. **"Route not found"**
   - Check the base_url doesn't include `/api`
   - Verify endpoint paths in requests

3. **JWT decode errors**
   - Ensure auth collection runs first
   - Check token generation in pre-request scripts

4. **Rate limiting**
   - Increase delay between requests: `--delay 1000`
   - Use development environment for testing

## 🤝 Contributing

1. Keep collections focused and organized
2. Add appropriate tests for all endpoints
3. Use environment variables for dynamic values
4. Document any new pre-request scripts
5. Update this README when adding features

## 📞 Support

For issues or questions:
- Check existing test results
- Review environment configurations
- Consult the main API documentation
- Contact the development team