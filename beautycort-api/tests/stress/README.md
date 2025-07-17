# BeautyCort API Stress Testing Suite

Comprehensive stress testing suite for the BeautyCort booking system, designed to validate performance, reliability, and scalability under high load conditions.

## 🎯 Test Coverage

### Core Stress Tests

1. **Concurrent Booking Race Conditions** (`concurrent-booking-stress.test.js`)
   - Tests 100+ concurrent users attempting to book the same time slot
   - Validates platform fee calculations under load (10% platform + 2.5% processing)
   - Ensures only one booking succeeds per slot with proper conflict handling
   - Performance target: Sub-3-second response times

2. **Rate Limiting Effectiveness** (`rate-limiting-stress.test.js`)
   - Tests API rate limiting under burst traffic patterns
   - Validates different limits: booking (10/min), availability (20/min), general (50/min)
   - Tests bypass resistance and distributed rate limiting across users
   - Ensures proper 429 responses with retry-after headers

3. **Availability System Load** (`availability-stress.test.js`)
   - Tests availability calculation performance under high concurrent load
   - Validates Jordan cultural considerations (prayer times, work week, Ramadan)
   - Tests cache effectiveness and invalidation under load
   - Includes multilingual support (Arabic/English) validation

4. **Database Connection Pressure** (`database-stress.test.js`)
   - Tests database connection pooling and deadlock prevention
   - Validates recovery from connection interruptions and memory pressure
   - Tests transaction handling under concurrent operations
   - Breaking point analysis with 50+ concurrent connections

5. **Notification Queue Load** (`notification-stress.test.js`)
   - Tests notification delivery timing and queue processing
   - Validates priority queuing and failure handling with retry mechanisms
   - Tests 1000+ notification processing with delivery timing validation
   - SMS and email rate limiting validation

6. **Mixed Workload Simulation** (`mixed-workload-stress.test.js`)
   - Tests realistic production traffic patterns
   - Peak hour simulation with 3x traffic multiplier
   - Breaking point analysis and memory pressure recovery
   - System stability during sustained load

### Support Utilities

- **Performance Monitor** (`utils/performance-monitor.js`) - Real-time metrics collection
- **Booking Factories** (`utils/booking-factories.js`) - Jordan-specific test data generation
- **Stress Test Helpers** (`utils/stress-test-helpers.js`) - Concurrent execution utilities

## 🚀 Quick Start

### Installation

```bash
cd beautycort-api/tests/stress
npm install
```

### Basic Usage

```bash
# List all available tests
npm run stress:list

# Run specific stress test
npm run stress:concurrent
npm run stress:rate-limit
npm run stress:availability

# Run all tests sequentially
npm run stress:all

# Run all tests in parallel (faster but more resource intensive)
npm run stress:all-parallel

# Run performance benchmark suite
npm run stress:benchmark

# Generate JSON report
npm run stress:report
```

### CLI Tool Usage

The stress test runner provides a comprehensive CLI interface:

```bash
# Make runner executable (one time)
chmod +x stress-runner.js

# List available tests
./stress-runner.js list

# Run specific test with options
./stress-runner.js run concurrent-booking --timeout 60000 --verbose

# Run all tests with custom configuration
./stress-runner.js run-all --parallel --report json --env staging

# Run performance benchmark
./stress-runner.js benchmark --verbose
```

## 📊 Performance Benchmarks

All stress tests validate the following performance requirements:

- **Response Times**: Sub-3-second booking completion under load
- **Concurrency**: Handle 100+ concurrent users without race conditions
- **Throughput**: Process sustained load without degradation
- **Error Rates**: Maintain <5% error rate under normal load
- **Recovery**: Graceful degradation and recovery from overload

## 🌍 Jordan Market Considerations

The stress tests include comprehensive validation of Jordan-specific features:

### Cultural & Religious
- **Prayer Times**: Automatic blocking during Dhuhr, Asr, and Maghrib prayers
- **Friday Restrictions**: Reduced availability following Jordan work week
- **Ramadan Hours**: Special scheduling during Ramadan month
- **Holidays**: Eid and national holiday handling

### Technical
- **Arabic Language**: Bilingual error messages and responses
- **Phone Validation**: Jordan number formats (77/78/79 prefixes)
- **Geolocation**: Amman, Irbid, and Aqaba location testing
- **Currency**: JOD (Jordanian Dinar) calculations

## 🔧 Configuration

### Environment Variables

```bash
# Database Configuration
DB_POOL_MIN=5
DB_POOL_MAX=20
DB_TIMEOUT=10000

# Rate Limiting
RATE_LIMIT_BOOKING=10
RATE_LIMIT_AVAILABILITY=20
RATE_LIMIT_GENERAL=50

# Notification System
NOTIFICATION_QUEUE_BATCH_SIZE=50
NOTIFICATION_QUEUE_CONCURRENCY=10

# Test Environment
NODE_ENV=test
STRESS_TEST_MODE=true
JWT_SECRET=your-test-secret
```

### Test Timeouts

Different tests have different timeout requirements:

- Concurrent Booking: 60 seconds
- Rate Limiting: 120 seconds (includes rate limit reset waiting)
- Availability: 45 seconds
- Database: 50 seconds
- Notification: 40 seconds
- Mixed Workload: 50 seconds

## 📈 Reporting

### Report Formats

The stress test runner supports multiple report formats:

```bash
# JSON report
./stress-runner.js run-all --report json

# Markdown report
./stress-runner.js run-all --report markdown

# Console output with metrics extraction
./stress-runner.js run concurrent-booking --verbose
```

### Report Contents

- Test execution summary
- Performance metrics (response times, success rates)
- Error analysis and categorization
- Resource utilization statistics
- Cultural feature validation results

### Sample Metrics

```
📈 Concurrent Booking Results:
  Total Requests: 100
  Successful: 99
  Failed: 1
  Success Rate: 99.00%
  Avg Response Time: 1247ms
  P95 Response Time: 2156ms
  Platform Fee Accuracy: 100%
  Race Condition Prevention: ✅ PASSED
```

## 🔍 Debugging

### Verbose Mode

Enable detailed logging for debugging:

```bash
./stress-runner.js run concurrent-booking --verbose
```

### Common Issues

1. **Database Connection Issues**
   - Check `DB_POOL_MAX` settings
   - Verify database is running and accessible
   - Monitor connection pool usage

2. **Rate Limiting False Positives**
   - Ensure clean test environment
   - Check rate limit windows haven't been exceeded
   - Verify Redis/cache is cleared between tests

3. **Memory Pressure**
   - Monitor system resources during tests
   - Adjust concurrency levels if needed
   - Check for memory leaks in test cleanup

4. **Authentication Failures**
   - Verify JWT_SECRET is set correctly
   - Check user factory data generation
   - Ensure clean database state

## 🚦 CI/CD Integration

### GitHub Actions

Example workflow for automated stress testing:

```yaml
name: Stress Tests
on:
  schedule:
    - cron: '0 2 * * *'  # Run nightly
  workflow_dispatch:

jobs:
  stress-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd beautycort-api/tests/stress
          npm install
      
      - name: Run stress tests
        run: |
          cd beautycort-api/tests/stress
          ./stress-runner.js run-all --report json
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
          NODE_ENV: test
      
      - name: Upload reports
        uses: actions/upload-artifact@v3
        with:
          name: stress-test-reports
          path: beautycort-api/tests/stress/reports/
```

### Performance Monitoring

Integrate with monitoring systems:

```bash
# Run benchmark and output metrics for monitoring
./stress-runner.js benchmark --report json | jq '.summary'
```

## 📚 Best Practices

### Test Development

1. **Isolation**: Each test should be completely independent
2. **Cleanup**: Always clean up test data and connections
3. **Realistic Data**: Use Jordan-specific test data
4. **Cultural Awareness**: Include Arabic language validation
5. **Performance Focus**: Always validate sub-3-second requirements

### Resource Management

1. **Connection Pooling**: Monitor database connections
2. **Memory Usage**: Track memory consumption during tests
3. **Cleanup**: Proper cleanup of test environments
4. **Concurrency**: Balance thoroughness with resource usage

### Monitoring

1. **Metrics Collection**: Comprehensive performance tracking
2. **Error Categorization**: Detailed error analysis
3. **Trend Analysis**: Track performance over time
4. **Alert Thresholds**: Set appropriate performance alerts

## 🛠️ Contributing

When adding new stress tests:

1. Follow the existing test structure and patterns
2. Include Jordan-specific cultural considerations
3. Add comprehensive performance validation
4. Update this README with new test descriptions
5. Include Arabic language support where applicable
6. Validate sub-3-second performance requirements

## 📄 License

MIT License - see LICENSE file for details.