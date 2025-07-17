# BeautyCort Operational Runbooks

**Version:** 1.0  
**Last Updated:** 2025-07-16  
**Team:** DevOps & Engineering  

---

## 📋 Overview

This document contains step-by-step procedures for common operational tasks and incident response for the BeautyCort production environment. These runbooks are designed to help team members quickly resolve issues and maintain system reliability.

---

## 🚨 Emergency Response

### Incident Response Process

#### 1. Initial Response (First 5 minutes)
1. **Acknowledge the alert** in PagerDuty/Slack
2. **Check system status** using health check dashboard
3. **Assess severity** based on impact and affected users
4. **Notify stakeholders** if severity is HIGH or CRITICAL
5. **Begin investigation** using monitoring tools

#### 2. Investigation (5-15 minutes)
1. **Check recent deployments** - was there a recent change?
2. **Review error logs** in New Relic/Sentry
3. **Check infrastructure metrics** (CPU, memory, disk, network)
4. **Validate external dependencies** (Supabase, Redis, payment gateway)
5. **Document findings** in incident channel

#### 3. Resolution (15+ minutes)
1. **Apply immediate fix** if known issue
2. **Execute rollback** if deployment-related
3. **Scale resources** if capacity issue
4. **Engage escalation** if needed
5. **Monitor recovery** and validate fix

#### 4. Post-Incident (Within 24 hours)
1. **Write incident report** with timeline and root cause
2. **Schedule post-mortem** meeting
3. **Create action items** to prevent recurrence
4. **Update runbooks** based on lessons learned

### Severity Levels

| Level | Impact | Response Time | Escalation |
|-------|--------|---------------|------------|
| **CRITICAL** | Complete service outage | Immediate | CTO, Product Manager |
| **HIGH** | Major feature degradation | 15 minutes | Engineering Lead |
| **MEDIUM** | Minor feature issues | 1 hour | On-call engineer |
| **LOW** | Non-user impacting | 4 hours | Next business day |

---

## 🏥 Health Check & Monitoring

### Daily Health Check Routine

#### Morning Health Check (9:00 AM)
```bash
# Run comprehensive health checks
cd /path/to/beautycort
ts-node scripts/health-checks.ts all

# Check key metrics
echo "=== System Overview ==="
curl -s https://api.beautycort.com/api/health | jq .
```

**Expected Results:**
- All health checks should be "healthy"
- Response times < 200ms for health endpoint
- Error rate < 1% over last 24 hours
- No critical alerts in monitoring dashboard

**If Issues Found:**
1. Document the issue in #engineering-alerts
2. Check recent deployments and changes
3. Review error logs and metrics
4. Follow specific troubleshooting guides below

### Monitoring Dashboard URLs
- **New Relic:** https://one.newrelic.com/beautycort
- **Sentry:** https://sentry.io/beautycort/
- **AWS CloudWatch:** https://console.aws.amazon.com/cloudwatch/
- **Supabase Dashboard:** https://app.supabase.com/project/your-project-id

---

## 🚀 Deployment Operations

### Standard Deployment Process

#### Pre-Deployment Checks
```bash
# 1. Verify CI/CD pipeline status
gh run list --limit 5

# 2. Check current system health
ts-node scripts/health-checks.ts health

# 3. Verify staging deployment
curl -s https://staging-api.beautycort.com/api/health

# 4. Check for active incidents
# Review monitoring dashboards for any ongoing issues
```

#### Production Deployment
```bash
# 1. Create deployment tag
git tag -a v1.0.1 -m "Production deployment v1.0.1"
git push origin v1.0.1

# 2. Monitor GitHub Actions deployment
gh run watch

# 3. Verify deployment success
sleep 60  # Wait for deployment to complete
ts-node scripts/health-checks.ts smoke

# 4. Monitor for 15 minutes
# Watch error rates and response times
```

#### Post-Deployment Validation
```bash
# 1. Run full health check suite
ts-node scripts/health-checks.ts all --format json > deployment-validation.json

# 2. Check key metrics
curl -s https://api.beautycort.com/api/health/detailed

# 3. Validate business functionality
# - User registration
# - Provider search
# - Booking creation
# - Payment processing
```

### Deployment Rollback

#### When to Rollback
- Error rate > 5% for 5+ minutes
- Response time > 2x baseline for 10+ minutes
- Critical feature completely broken
- Security incident detected

#### Rollback Process
```bash
# 1. Execute emergency rollback
ts-node scripts/rollback-manager.ts rollback "High error rate detected"

# 2. Monitor rollback progress
# Watch logs and health checks during rollback

# 3. Validate rollback success
ts-node scripts/health-checks.ts all

# 4. Notify stakeholders
# Post in #deployments channel with status update
```

---

## 🗄️ Database Operations

### Database Health Monitoring

#### Daily Database Check
```bash
# Check database connection
curl -s "https://api.beautycort.com/api/health/detailed" | jq '.checks[] | select(.name == "Database Health")'

# Check slow queries (requires Supabase dashboard)
# Navigate to: Performance > Slow Queries
# Look for queries > 1000ms execution time

# Check connection count
# Navigate to: Reports > System Stats
# Monitor active connections vs max connections
```

#### Database Performance Issues

**Symptoms:**
- High response times (> 1000ms)
- Database connection errors
- High CPU usage in database metrics

**Investigation Steps:**
1. **Check slow queries** in Supabase dashboard
2. **Review recent schema changes** 
3. **Check connection pool status**
4. **Monitor resource usage** (CPU, memory, I/O)

**Resolution Steps:**
```bash
# 1. Identify slow queries
# Use Supabase Performance tab

# 2. Check for missing indexes
# Review query execution plans

# 3. Optimize problematic queries
# Add EXPLAIN ANALYZE to slow queries

# 4. Consider read replicas if read-heavy
# Configure in Supabase settings
```

### Database Backup Operations

#### Manual Backup
```bash
# Create immediate backup
ts-node scripts/database-backup.ts backup

# Verify backup completion
# Check AWS S3 bucket or configured backup storage

# Test backup integrity
ts-node scripts/database-backup.ts verify-latest
```

#### Restore from Backup
```bash
# List available backups
ts-node scripts/database-backup.ts list

# Restore from specific backup
ts-node scripts/database-backup.ts restore s3://beautycort-backups/backup-2025-07-16-123456.gz

# Verify restore success
ts-node scripts/health-checks.ts smoke
```

### Database Migration Issues

#### Failed Migration Recovery
```bash
# 1. Check migration status
npm run migrate:status

# 2. Identify failed migration
# Review migration logs and error messages

# 3. Fix migration script
# Edit SQL files in database/migrations/

# 4. Retry migration
npm run migrate

# 5. Verify data integrity
npm run validate:data
```

---

## 🔧 Application Troubleshooting

### High Error Rate Investigation

#### Steps to Investigate
```bash
# 1. Check error distribution
# New Relic: APM > Errors > Error Analytics
# Look for error patterns by endpoint, user, time

# 2. Review recent changes
git log --oneline --since="2 hours ago"

# 3. Check external dependencies
ts-node scripts/health-checks.ts health

# 4. Review application logs
# Check CloudWatch logs or local logs/app.log
```

#### Common Error Scenarios

**JWT Token Issues:**
```bash
# Check JWT configuration
echo "JWT_SECRET length: ${#JWT_SECRET}"
echo "JWT_EXPIRES_IN: $JWT_EXPIRES_IN"

# Verify token blacklisting
curl -s https://api.beautycort.com/api/auth/verify-blacklist

# Fix: Restart application if configuration changed
docker-compose restart api
```

**Database Connection Issues:**
```bash
# Check connection count
# Supabase Dashboard > Reports > System Stats

# Check connection pool
grep "connection" logs/app.log | tail -20

# Fix: Restart application to reset connections
docker-compose restart api
```

**Redis Connection Issues:**
```bash
# Test Redis connectivity
redis-cli -u $REDIS_URL ping

# Check Redis memory usage
redis-cli -u $REDIS_URL info memory

# Fix: Clear Redis cache if memory full
redis-cli -u $REDIS_URL flushall
```

### High Response Time Investigation

#### Performance Analysis
```bash
# 1. Check average response times
# New Relic: APM > Monitoring > Response Time

# 2. Identify slow endpoints
# New Relic: APM > Monitoring > Transactions

# 3. Check database query performance
# Supabase: Performance > Slow Queries

# 4. Check external API response times
curl -w "%{time_total}\n" -s https://api.tap.company/v2/charges
```

#### Resolution Steps
```bash
# 1. Scale application if CPU/memory high
kubectl scale deployment api --replicas=5

# 2. Enable caching for slow endpoints
# Add Redis caching to frequently accessed data

# 3. Optimize database queries
# Add indexes for slow queries
# Review N+1 query patterns

# 4. Enable CDN for static assets
# Configure CloudFront or CloudFlare
```

---

## 🔐 Security Operations

### Security Incident Response

#### Potential Security Breach
1. **Immediate Actions:**
   - Rotate JWT secrets
   - Review access logs
   - Check for unauthorized access
   - Notify security team

2. **Investigation:**
   ```bash
   # Check failed authentication attempts
   grep "authentication failed" logs/app.log | tail -50
   
   # Review IP access patterns
   grep "suspicious" logs/security.log
   
   # Check for privilege escalation
   grep "authorization failed" logs/app.log
   ```

3. **Containment:**
   ```bash
   # Block suspicious IPs
   # Update rate limiting rules
   
   # Force logout all users
   redis-cli -u $REDIS_URL flushall
   
   # Rotate all secrets
   # Update JWT_SECRET, API keys, database passwords
   ```

### SSL Certificate Management

#### Certificate Expiration Check
```bash
# Check SSL certificate status
ts-node scripts/health-checks.ts health | grep "SSL Certificate"

# Manual certificate check
openssl s_client -connect api.beautycort.com:443 -servername api.beautycort.com 2>/dev/null | openssl x509 -noout -dates
```

#### Certificate Renewal (Let's Encrypt)
```bash
# Renew certificates
certbot renew --nginx

# Restart nginx
systemctl restart nginx

# Verify renewal
openssl x509 -in /etc/letsencrypt/live/api.beautycort.com/cert.pem -text -noout | grep "Not After"
```

---

## 🏗️ Infrastructure Operations

### Server Resource Management

#### Disk Space Issues
```bash
# Check disk usage
df -h

# Find large files
du -sh /var/log/* | sort -rh | head -10

# Clean up logs
find /var/log -name "*.log" -mtime +7 -delete
docker system prune -f

# Restart services if needed
docker-compose restart
```

#### Memory Issues
```bash
# Check memory usage
free -h

# Identify memory-heavy processes
ps aux --sort=-%mem | head -10

# Check application memory usage
docker stats

# Restart services if memory leak suspected
docker-compose restart api
```

#### CPU Issues
```bash
# Check CPU usage
top -bn1 | grep "Cpu(s)"

# Identify CPU-heavy processes
ps aux --sort=-%cpu | head -10

# Check load average
uptime

# Scale application if needed
docker-compose up --scale api=3
```

### Load Balancer Management

#### AWS Application Load Balancer
```bash
# Check target group health
aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:region:account:targetgroup/name

# Check load balancer status
aws elbv2 describe-load-balancers --names beautycort-alb

# Update target group if needed
aws elbv2 register-targets --target-group-arn arn:aws:... --targets Id=i-instance-id
```

#### NGINX Configuration
```bash
# Test NGINX configuration
nginx -t

# Reload NGINX configuration
nginx -s reload

# Check NGINX status
systemctl status nginx

# View NGINX access logs
tail -f /var/log/nginx/access.log
```

---

## 📊 Performance Optimization

### Database Performance Tuning

#### Query Optimization
```sql
-- Find slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;

-- Check missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY n_distinct DESC;

-- Analyze table statistics
ANALYZE users;
ANALYZE providers;
ANALYZE bookings;
```

#### Index Management
```sql
-- Create index for slow query
CREATE INDEX CONCURRENTLY idx_providers_location ON providers USING GIST(location);

-- Monitor index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

-- Remove unused indexes
DROP INDEX IF EXISTS unused_index_name;
```

### Application Performance Tuning

#### Redis Cache Optimization
```bash
# Check cache hit ratio
redis-cli -u $REDIS_URL info stats | grep hit

# Monitor cache memory usage
redis-cli -u $REDIS_URL info memory

# Optimize cache TTL settings
redis-cli -u $REDIS_URL config set maxmemory-policy allkeys-lru
```

#### API Response Optimization
```bash
# Enable response compression
# Add compression middleware in app.ts

# Implement response caching
# Add Redis caching for frequently accessed endpoints

# Optimize JSON responses
# Remove unnecessary fields from API responses
```

---

## 🔄 Maintenance Operations

### Routine Maintenance Tasks

#### Weekly Maintenance (Sundays 2:00 AM)
```bash
# 1. Update dependencies
npm audit --audit-level moderate
npm update

# 2. Clean up logs
find logs/ -name "*.log" -mtime +7 -delete

# 3. Backup verification
ts-node scripts/database-backup.ts verify-all

# 4. Performance review
# Review New Relic performance trends
# Check for slow queries and optimize

# 5. Security scan
npm audit --audit-level high
docker scan beautycort-api:latest
```

#### Monthly Maintenance (First Sunday)
```bash
# 1. Certificate renewal check
certbot certificates

# 2. Dependency updates
npm outdated
npm update

# 3. Database maintenance
VACUUM ANALYZE;
REINDEX DATABASE beautycort;

# 4. Security review
# Review access logs
# Update security policies
# Rotate secrets if needed

# 5. Backup testing
# Test restore from backup
# Verify backup integrity
```

### Scaling Operations

#### Manual Scaling
```bash
# Scale API instances
docker-compose up --scale api=5

# Scale database connections
# Update connection pool settings

# Monitor scaling effect
ts-node scripts/health-checks.ts all
```

#### Auto-scaling Configuration
```yaml
# Kubernetes HPA configuration
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: beautycort-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: beautycort-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

---

## 📞 Emergency Contacts

### Team Contacts

| Role | Name | Phone | Email | Backup |
|------|------|-------|-------|---------|
| **DevOps Lead** | [Name] | +962 77 XXX XXXX | devops@beautycort.com | [Backup] |
| **Engineering Lead** | [Name] | +962 77 XXX XXXX | engineering@beautycort.com | [Backup] |
| **Security Lead** | [Name] | +962 77 XXX XXXX | security@beautycort.com | [Backup] |
| **Product Manager** | [Name] | +962 77 XXX XXXX | product@beautycort.com | [Backup] |
| **CTO** | [Name] | +962 77 XXX XXXX | cto@beautycort.com | [Backup] |

### Vendor Contacts

| Service | Contact | Support URL | Priority |
|---------|---------|-------------|----------|
| **Supabase** | support@supabase.com | https://supabase.com/support | Critical |
| **AWS** | AWS Support Console | https://console.aws.amazon.com/support/ | Critical |
| **Twilio** | help@twilio.com | https://support.twilio.com | High |
| **Tap Payments** | support@tap.company | https://www.tap.company/support | High |
| **New Relic** | support@newrelic.com | https://support.newrelic.com | Medium |

---

## 📚 Additional Resources

### Documentation Links
- **API Documentation:** https://docs.beautycort.com/api
- **Architecture Overview:** https://docs.beautycort.com/architecture
- **Security Policies:** https://docs.beautycort.com/security
- **Deployment Guide:** https://docs.beautycort.com/deployment

### Monitoring Dashboards
- **System Health:** https://beautycort.newrelic.com/dashboards/system-health
- **Business Metrics:** https://beautycort.newrelic.com/dashboards/business-metrics
- **Error Tracking:** https://sentry.io/beautycort/dashboard/
- **Uptime Monitoring:** https://pingdom.com/beautycort

### Internal Tools
- **Runbook Repository:** https://github.com/beautycort/runbooks
- **Infrastructure Code:** https://github.com/beautycort/infrastructure
- **Monitoring Config:** https://github.com/beautycort/monitoring

---

## 📝 Change Log

| Date | Version | Changes | Author |
|------|---------|---------|---------|
| 2025-07-16 | 1.0 | Initial runbook creation | DevOps Team |

---

*These runbooks should be reviewed and updated quarterly or after major incidents. All team members should be familiar with relevant procedures for their role.*

**Last Review:** 2025-07-16  
**Next Review:** 2025-10-16  
**Document Owner:** DevOps Team