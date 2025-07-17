#!/bin/bash

# BeautyCort Production Deployment Script
# Comprehensive deployment with health checks, monitoring, and rollback capability

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DEPLOYMENT_LOG="${PROJECT_ROOT}/deployment-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="production"
SKIP_TESTS="false"
SKIP_BACKUP="false"
SKIP_HEALTH_CHECKS="false"
AUTO_ROLLBACK="true"
CONFIRMATION_REQUIRED="true"

# Deployment configuration
HEALTH_CHECK_RETRIES=10
HEALTH_CHECK_INTERVAL=30
SMOKE_TEST_TIMEOUT=300
ROLLBACK_TIMEOUT=900

# Initialize deployment tracking
DEPLOYMENT_ID="deploy-$(date +%Y%m%d-%H%M%S)"
DEPLOYMENT_START_TIME=$(date +%s)

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$DEPLOYMENT_LOG"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}" | tee -a "$DEPLOYMENT_LOG"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}" | tee -a "$DEPLOYMENT_LOG"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" | tee -a "$DEPLOYMENT_LOG"
    exit 1
}

# Notification functions
send_deployment_notification() {
    local status="$1"
    local message="$2"
    local duration="$3"
    
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        local emoji=""
        local color=""
        
        case "$status" in
            "started")
                emoji="🚀"
                color="warning"
                ;;
            "success")
                emoji="✅"
                color="good"
                ;;
            "failed")
                emoji="❌"
                color="danger"
                ;;
            "rollback")
                emoji="🔄"
                color="warning"
                ;;
        esac
        
        local payload=$(cat <<EOF
{
    "channel": "#deployments",
    "username": "BeautyCort Deploy Bot",
    "icon_emoji": "$emoji",
    "attachments": [
        {
            "color": "$color",
            "title": "Production Deployment $status",
            "fields": [
                {
                    "title": "Environment",
                    "value": "$ENVIRONMENT",
                    "short": true
                },
                {
                    "title": "Deployment ID",
                    "value": "$DEPLOYMENT_ID",
                    "short": true
                },
                {
                    "title": "Duration",
                    "value": "${duration}s",
                    "short": true
                },
                {
                    "title": "Message",
                    "value": "$message",
                    "short": false
                }
            ],
            "footer": "BeautyCort Production Deployment",
            "ts": $(date +%s)
        }
    ]
}
EOF
)
        
        curl -X POST -H 'Content-type: application/json' \
             --data "$payload" \
             "$SLACK_WEBHOOK_URL" &>/dev/null || true
    fi
}

# Pre-deployment validation
validate_environment() {
    log "Validating deployment environment..."
    
    # Check required environment variables
    local required_vars=(
        "NODE_ENV"
        "SUPABASE_URL"
        "SUPABASE_SERVICE_KEY"
        "JWT_SECRET"
        "REDIS_URL"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            error "Required environment variable $var is not set"
        fi
    done
    
    # Validate JWT secret strength
    if [[ ${#JWT_SECRET} -lt 32 ]]; then
        error "JWT_SECRET must be at least 32 characters long (current: ${#JWT_SECRET})"
    fi
    
    # Check if production environment
    if [[ "$NODE_ENV" != "production" ]]; then
        warning "NODE_ENV is not set to 'production' (current: $NODE_ENV)"
    fi
    
    success "Environment validation passed"
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Running pre-deployment checks..."
    
    # Check if Docker is running
    if ! docker info &>/dev/null; then
        error "Docker is not running or not accessible"
    fi
    
    # Check available disk space
    local available_space=$(df / | awk 'NR==2 {print $4}')
    local required_space=1048576  # 1GB in KB
    
    if [[ $available_space -lt $required_space ]]; then
        error "Insufficient disk space. Available: ${available_space}KB, Required: ${required_space}KB"
    fi
    
    # Check if ports are available
    if netstat -tuln | grep -q ":3000 "; then
        warning "Port 3000 is already in use"
    fi
    
    # Validate configuration files
    if [[ ! -f "$PROJECT_ROOT/docker-compose.yml" ]]; then
        error "docker-compose.yml not found"
    fi
    
    success "Pre-deployment checks passed"
}

# Create pre-deployment backup
create_backup() {
    if [[ "$SKIP_BACKUP" == "true" ]]; then
        warning "Skipping backup creation"
        return 0
    fi
    
    log "Creating pre-deployment backup..."
    
    # Set backup environment variable to indicate pre-deployment backup
    export BACKUP_TYPE="pre-deployment"
    export BACKUP_TAG="$DEPLOYMENT_ID"
    
    # Run backup script
    if ! ts-node "$PROJECT_ROOT/scripts/database-backup.ts" backup; then
        error "Pre-deployment backup failed"
    fi
    
    success "Pre-deployment backup created"
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        warning "Skipping tests"
        return 0
    fi
    
    log "Running test suite..."
    
    cd "$PROJECT_ROOT/beautycort-api"
    
    # Run linting
    log "Running linting..."
    if ! npm run lint; then
        error "Linting failed"
    fi
    
    # Run type checking
    log "Running type checking..."
    if ! npm run typecheck; then
        error "Type checking failed"
    fi
    
    # Run unit tests
    log "Running unit tests..."
    if ! npm run test:ci; then
        error "Unit tests failed"
    fi
    
    # Run integration tests
    log "Running integration tests..."
    if ! npm run test:integration; then
        warning "Integration tests failed (continuing deployment)"
    fi
    
    cd "$PROJECT_ROOT"
    success "Tests completed"
}

# Build and deploy application
deploy_application() {
    log "Deploying application..."
    
    # Build Docker images
    log "Building Docker images..."
    if ! docker-compose build --no-cache; then
        error "Docker build failed"
    fi
    
    # Stop existing containers
    log "Stopping existing containers..."
    docker-compose down --remove-orphans || true
    
    # Start new containers
    log "Starting new containers..."
    if ! docker-compose up -d; then
        error "Container startup failed"
    fi
    
    # Wait for containers to be ready
    log "Waiting for containers to be ready..."
    sleep 30
    
    success "Application deployed"
}

# Health check validation
validate_deployment() {
    if [[ "$SKIP_HEALTH_CHECKS" == "true" ]]; then
        warning "Skipping health checks"
        return 0
    fi
    
    log "Validating deployment with health checks..."
    
    local attempt=1
    local max_attempts=$HEALTH_CHECK_RETRIES
    
    while [[ $attempt -le $max_attempts ]]; do
        log "Health check attempt $attempt/$max_attempts..."
        
        if ts-node "$PROJECT_ROOT/scripts/health-checks.ts" health --format json > /tmp/health-check-result.json; then
            local status=$(cat /tmp/health-check-result.json | jq -r '.status')
            
            if [[ "$status" == "healthy" ]]; then
                success "Health checks passed"
                return 0
            elif [[ "$status" == "degraded" ]]; then
                warning "Health checks show degraded status"
                if [[ $attempt -eq $max_attempts ]]; then
                    warning "Deployment completed with degraded health status"
                    return 0
                fi
            else
                warning "Health checks failed (attempt $attempt/$max_attempts)"
            fi
        else
            warning "Health check execution failed (attempt $attempt/$max_attempts)"
        fi
        
        if [[ $attempt -lt $max_attempts ]]; then
            log "Waiting ${HEALTH_CHECK_INTERVAL}s before next attempt..."
            sleep $HEALTH_CHECK_INTERVAL
        fi
        
        ((attempt++))
    done
    
    error "Health checks failed after $max_attempts attempts"
}

# Run smoke tests
run_smoke_tests() {
    log "Running post-deployment smoke tests..."
    
    local timeout=$SMOKE_TEST_TIMEOUT
    
    if timeout $timeout ts-node "$PROJECT_ROOT/scripts/health-checks.ts" smoke --format json > /tmp/smoke-test-result.json; then
        local status=$(cat /tmp/smoke-test-result.json | jq -r '.status')
        
        if [[ "$status" == "passed" ]]; then
            success "Smoke tests passed"
            return 0
        elif [[ "$status" == "partial" ]]; then
            warning "Some smoke tests failed"
            local failed_tests=$(cat /tmp/smoke-test-result.json | jq -r '.summary.failed')
            local total_tests=$(cat /tmp/smoke-test-result.json | jq -r '.summary.total')
            
            if [[ $failed_tests -le 2 ]] && [[ $total_tests -gt 5 ]]; then
                warning "Deployment completed with minor smoke test failures ($failed_tests/$total_tests failed)"
                return 0
            else
                error "Too many smoke tests failed ($failed_tests/$total_tests)"
            fi
        else
            error "Smoke tests failed"
        fi
    else
        error "Smoke tests timed out or failed to execute"
    fi
}

# Performance validation
validate_performance() {
    log "Validating performance metrics..."
    
    # Check response times
    local api_response_time=$(curl -w "%{time_total}" -s -o /dev/null http://localhost:3000/api/health)
    local response_time_ms=$(echo "$api_response_time * 1000" | bc)
    
    if (( $(echo "$response_time_ms > 2000" | bc -l) )); then
        warning "High response time detected: ${response_time_ms}ms"
    else
        log "Response time acceptable: ${response_time_ms}ms"
    fi
    
    # Check memory usage
    local memory_usage=$(docker stats --no-stream --format "table {{.Container}}\t{{.MemUsage}}" | grep beautycort-api)
    log "Memory usage: $memory_usage"
    
    success "Performance validation completed"
}

# Execute rollback
execute_rollback() {
    log "Executing emergency rollback..."
    
    local rollback_reason="$1"
    
    # Execute rollback script
    if timeout $ROLLBACK_TIMEOUT ts-node "$PROJECT_ROOT/scripts/rollback-manager.ts" rollback "$rollback_reason" production; then
        success "Rollback completed successfully"
        return 0
    else
        error "Rollback failed - manual intervention required"
    fi
}

# Monitoring setup
setup_monitoring() {
    log "Setting up deployment monitoring..."
    
    # Add deployment marker to New Relic
    if [[ -n "$NEW_RELIC_API_KEY" ]]; then
        local deployment_data=$(cat <<EOF
{
    "deployment": {
        "revision": "$(git rev-parse HEAD)",
        "changelog": "Production deployment $DEPLOYMENT_ID",
        "description": "Automated production deployment",
        "user": "${USER:-automated}",
        "timestamp": $(date +%s)
    }
}
EOF
)
        
        curl -X POST \
             -H "X-Api-Key: $NEW_RELIC_API_KEY" \
             -H "Content-Type: application/json" \
             -d "$deployment_data" \
             "https://api.newrelic.com/v2/applications/${NEW_RELIC_APP_ID}/deployments.json" || true
    fi
    
    # Send deployment event to monitoring systems
    if [[ -n "$DATADOG_API_KEY" ]]; then
        curl -X POST \
             -H "Content-Type: application/json" \
             -H "DD-API-KEY: $DATADOG_API_KEY" \
             -d "{
                 \"title\": \"Production Deployment\",
                 \"text\": \"Deployment $DEPLOYMENT_ID completed\",
                 \"alert_type\": \"info\",
                 \"tags\": [\"deployment\", \"production\", \"beautycort\"]
             }" \
             "https://api.datadoghq.com/api/v1/events" || true
    fi
    
    success "Monitoring setup completed"
}

# Cleanup temporary files
cleanup() {
    log "Cleaning up temporary files..."
    
    # Remove temporary files
    rm -f /tmp/health-check-result.json
    rm -f /tmp/smoke-test-result.json
    
    # Clean up old Docker images
    docker image prune -f || true
    
    success "Cleanup completed"
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-tests)
                SKIP_TESTS="true"
                shift
                ;;
            --skip-backup)
                SKIP_BACKUP="true"
                shift
                ;;
            --skip-health-checks)
                SKIP_HEALTH_CHECKS="true"
                shift
                ;;
            --no-rollback)
                AUTO_ROLLBACK="false"
                shift
                ;;
            --no-confirmation)
                CONFIRMATION_REQUIRED="false"
                shift
                ;;
            --environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                ;;
        esac
    done
}

# Show usage information
show_usage() {
    cat << EOF
BeautyCort Production Deployment Script

Usage: $0 [OPTIONS]

Options:
    --skip-tests           Skip running tests
    --skip-backup          Skip creating pre-deployment backup
    --skip-health-checks   Skip post-deployment health checks
    --no-rollback          Disable automatic rollback on failure
    --no-confirmation      Skip deployment confirmation prompt
    --environment ENV      Target environment (default: production)
    --help                 Show this help message

Examples:
    $0                                    # Full deployment with all checks
    $0 --skip-tests --no-confirmation     # Quick deployment without tests
    $0 --environment staging              # Deploy to staging

Environment Variables:
    SLACK_WEBHOOK_URL     Slack webhook for notifications
    NEW_RELIC_API_KEY     New Relic API key for deployment tracking
    DATADOG_API_KEY       DataDog API key for event tracking

EOF
}

# Deployment confirmation
confirm_deployment() {
    if [[ "$CONFIRMATION_REQUIRED" != "true" ]]; then
        return 0
    fi
    
    echo
    echo "=========================================="
    echo "BeautyCort Production Deployment"
    echo "=========================================="
    echo "Environment: $ENVIRONMENT"
    echo "Deployment ID: $DEPLOYMENT_ID"
    echo "Git Commit: $(git rev-parse --short HEAD)"
    echo "Skip Tests: $SKIP_TESTS"
    echo "Skip Backup: $SKIP_BACKUP"
    echo "Skip Health Checks: $SKIP_HEALTH_CHECKS"
    echo "Auto Rollback: $AUTO_ROLLBACK"
    echo "=========================================="
    echo
    
    read -p "Do you want to proceed with this deployment? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Deployment cancelled by user"
        exit 0
    fi
}

# Main deployment function
main() {
    log "Starting BeautyCort production deployment..."
    log "Deployment ID: $DEPLOYMENT_ID"
    log "Environment: $ENVIRONMENT"
    
    # Send start notification
    send_deployment_notification "started" "Production deployment initiated" "0"
    
    # Track deployment success/failure
    local deployment_success="false"
    local deployment_duration=0
    
    # Trap to ensure cleanup and notification on exit
    trap 'cleanup; 
          deployment_duration=$(($(date +%s) - DEPLOYMENT_START_TIME));
          if [[ "$deployment_success" != "true" ]]; then
              send_deployment_notification "failed" "Deployment failed after ${deployment_duration}s" "$deployment_duration";
          fi' EXIT
    
    try_deployment() {
        # Pre-deployment phase
        validate_environment
        pre_deployment_checks
        confirm_deployment
        create_backup
        
        # Testing phase
        run_tests
        
        # Deployment phase
        deploy_application
        
        # Validation phase
        validate_deployment
        run_smoke_tests
        validate_performance
        
        # Post-deployment phase
        setup_monitoring
        
        deployment_success="true"
    }
    
    # Execute deployment with rollback capability
    if try_deployment; then
        deployment_duration=$(($(date +%s) - DEPLOYMENT_START_TIME))
        success "Deployment completed successfully in ${deployment_duration}s"
        send_deployment_notification "success" "Deployment completed successfully" "$deployment_duration"
        
        # Log deployment details
        log "Deployment Summary:"
        log "  Deployment ID: $DEPLOYMENT_ID"
        log "  Duration: ${deployment_duration}s"
        log "  Git Commit: $(git rev-parse HEAD)"
        log "  Environment: $ENVIRONMENT"
        log "  Log File: $DEPLOYMENT_LOG"
        
        # Final health check
        ts-node "$PROJECT_ROOT/scripts/health-checks.ts" all --format json > "${PROJECT_ROOT}/deployment-validation-${DEPLOYMENT_ID}.json"
        log "Deployment validation saved to deployment-validation-${DEPLOYMENT_ID}.json"
        
    else
        deployment_duration=$(($(date +%s) - DEPLOYMENT_START_TIME))
        error_msg="Deployment failed after ${deployment_duration}s"
        
        if [[ "$AUTO_ROLLBACK" == "true" ]]; then
            warning "$error_msg - attempting automatic rollback..."
            send_deployment_notification "rollback" "Deployment failed, executing rollback" "$deployment_duration"
            
            if execute_rollback "Deployment validation failed"; then
                deployment_duration=$(($(date +%s) - DEPLOYMENT_START_TIME))
                success "Rollback completed successfully"
                send_deployment_notification "rollback" "Rollback completed successfully" "$deployment_duration"
            else
                send_deployment_notification "failed" "Deployment and rollback both failed - manual intervention required" "$deployment_duration"
            fi
        else
            send_deployment_notification "failed" "$error_msg - automatic rollback disabled" "$deployment_duration"
        fi
        
        error "$error_msg"
    fi
}

# Parse arguments and run deployment
parse_arguments "$@"

# Change to project directory
cd "$PROJECT_ROOT"

# Run main deployment
main

# Success exit
exit 0