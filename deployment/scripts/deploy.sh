#!/bin/bash

# BeautyCort Deployment Script
# This script handles deployment to different environments and cloud providers

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DEPLOYMENT_DIR="${PROJECT_ROOT}/deployment"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="staging"
PLATFORM="local"
COMPONENT="all"
SKIP_TESTS="false"
SKIP_BUILD="false"
FORCE_DEPLOY="false"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Deploy BeautyCort application to various environments and platforms.

Options:
    -e, --environment ENV    Environment (local, staging, production) [default: staging]
    -p, --platform PLATFORM Cloud platform (local, aws, gcp, azure) [default: local]
    -c, --component COMP     Component (api, web, mobile, all) [default: all]
    -s, --skip-tests         Skip running tests
    -b, --skip-build         Skip building images
    -f, --force              Force deployment without confirmation
    -h, --help               Show this help message

Examples:
    $0 --environment production --platform aws
    $0 --component api --platform gcp --skip-tests
    $0 --environment staging --platform local --force

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -p|--platform)
            PLATFORM="$2"
            shift 2
            ;;
        -c|--component)
            COMPONENT="$2"
            shift 2
            ;;
        -s|--skip-tests)
            SKIP_TESTS="true"
            shift
            ;;
        -b|--skip-build)
            SKIP_BUILD="true"
            shift
            ;;
        -f|--force)
            FORCE_DEPLOY="true"
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Validate inputs
if [[ ! "$ENVIRONMENT" =~ ^(local|staging|production)$ ]]; then
    error "Environment must be one of: local, staging, production"
fi

if [[ ! "$PLATFORM" =~ ^(local|aws|gcp|azure)$ ]]; then
    error "Platform must be one of: local, aws, gcp, azure"
fi

if [[ ! "$COMPONENT" =~ ^(api|web|mobile|all)$ ]]; then
    error "Component must be one of: api, web, mobile, all"
fi

# Pre-deployment checks
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi
    
    if ! docker info &> /dev/null; then
        error "Docker is not running. Please start Docker first."
    fi
    
    # Check if required tools are installed based on platform
    case $PLATFORM in
        aws)
            if ! command -v aws &> /dev/null; then
                error "AWS CLI is not installed. Please install AWS CLI first."
            fi
            ;;
        gcp)
            if ! command -v gcloud &> /dev/null; then
                error "Google Cloud SDK is not installed. Please install gcloud first."
            fi
            ;;
        azure)
            if ! command -v az &> /dev/null; then
                error "Azure CLI is not installed. Please install Azure CLI first."
            fi
            ;;
    esac
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js first."
    fi
    
    # Check if required environment files exist
    if [[ "$PLATFORM" != "local" ]]; then
        ENV_FILE="${PROJECT_ROOT}/.env.${ENVIRONMENT}"
        if [[ ! -f "$ENV_FILE" ]]; then
            error "Environment file $ENV_FILE not found. Please create it first."
        fi
    fi
    
    success "Prerequisites check passed"
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        warning "Skipping tests"
        return 0
    fi
    
    log "Running tests..."
    
    if [[ "$COMPONENT" == "all" || "$COMPONENT" == "api" ]]; then
        log "Testing API..."
        cd "${PROJECT_ROOT}/beautycort-api"
        npm test
    fi
    
    if [[ "$COMPONENT" == "all" || "$COMPONENT" == "web" ]]; then
        log "Testing Web..."
        cd "${PROJECT_ROOT}/beautycort-web"
        npm test
    fi
    
    if [[ "$COMPONENT" == "all" || "$COMPONENT" == "mobile" ]]; then
        log "Testing Mobile..."
        cd "${PROJECT_ROOT}/beautycort-mobile"
        npm test
    fi
    
    success "All tests passed"
}

# Build Docker images
build_images() {
    if [[ "$SKIP_BUILD" == "true" ]]; then
        warning "Skipping build"
        return 0
    fi
    
    log "Building Docker images..."
    
    cd "$PROJECT_ROOT"
    
    if [[ "$COMPONENT" == "all" || "$COMPONENT" == "api" ]]; then
        log "Building API image..."
        docker build -t beautycort-api:latest ./beautycort-api
    fi
    
    if [[ "$COMPONENT" == "all" || "$COMPONENT" == "web" ]]; then
        log "Building Web image..."
        docker build -t beautycort-web:latest ./beautycort-web
    fi
    
    success "Images built successfully"
}

# Deploy to local environment
deploy_local() {
    log "Deploying to local environment..."
    
    cd "$PROJECT_ROOT"
    
    # Use development docker-compose
    if [[ "$ENVIRONMENT" == "production" ]]; then
        COMPOSE_FILE="docker-compose.yml"
    else
        COMPOSE_FILE="docker-compose.dev.yml"
    fi
    
    # Stop existing containers
    docker-compose -f "$COMPOSE_FILE" down
    
    # Start new containers
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Wait for services to be ready
    log "Waiting for services to be ready..."
    sleep 10
    
    # Health check
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        success "API is healthy"
    else
        error "API health check failed"
    fi
    
    success "Local deployment completed"
}

# Deploy to AWS
deploy_aws() {
    log "Deploying to AWS..."
    
    # Check if AWS credentials are configured
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured. Please run 'aws configure' first."
    fi
    
    cd "${DEPLOYMENT_DIR}/aws"
    
    # Deploy CloudFormation stack
    aws cloudformation deploy \
        --template-file cloudformation.yaml \
        --stack-name "beautycort-${ENVIRONMENT}" \
        --parameter-overrides Environment="$ENVIRONMENT" \
        --capabilities CAPABILITY_IAM \
        --region us-east-1
    
    success "AWS deployment completed"
}

# Deploy to GCP
deploy_gcp() {
    log "Deploying to GCP..."
    
    # Check if gcloud is authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        error "Not authenticated with gcloud. Please run 'gcloud auth login' first."
    fi
    
    cd "${DEPLOYMENT_DIR}/gcp"
    
    # Initialize Terraform
    terraform init
    
    # Plan deployment
    terraform plan -var="environment=$ENVIRONMENT"
    
    # Apply if not in staging
    if [[ "$ENVIRONMENT" != "staging" ]] || [[ "$FORCE_DEPLOY" == "true" ]]; then
        terraform apply -var="environment=$ENVIRONMENT" -auto-approve
    fi
    
    success "GCP deployment completed"
}

# Deploy to Azure
deploy_azure() {
    log "Deploying to Azure..."
    
    # Check if Azure CLI is authenticated
    if ! az account show &> /dev/null; then
        error "Not authenticated with Azure CLI. Please run 'az login' first."
    fi
    
    cd "${DEPLOYMENT_DIR}/azure"
    
    # Initialize Terraform
    terraform init
    
    # Plan deployment
    terraform plan -var="environment=$ENVIRONMENT"
    
    # Apply if not in staging
    if [[ "$ENVIRONMENT" != "staging" ]] || [[ "$FORCE_DEPLOY" == "true" ]]; then
        terraform apply -var="environment=$ENVIRONMENT" -auto-approve
    fi
    
    success "Azure deployment completed"
}

# Deploy mobile app
deploy_mobile() {
    log "Deploying mobile app..."
    
    cd "${PROJECT_ROOT}/beautycort-mobile"
    
    # Check if Expo CLI is installed
    if ! command -v expo &> /dev/null; then
        error "Expo CLI is not installed. Please run 'npm install -g expo-cli' first."
    fi
    
    # Build and deploy based on environment
    if [[ "$ENVIRONMENT" == "production" ]]; then
        expo build:android
        expo build:ios
    else
        expo publish --release-channel staging
    fi
    
    success "Mobile app deployment completed"
}

# Confirmation prompt
confirm_deployment() {
    if [[ "$FORCE_DEPLOY" == "true" ]]; then
        return 0
    fi
    
    echo
    echo "=========================================="
    echo "Deployment Configuration:"
    echo "Environment: $ENVIRONMENT"
    echo "Platform: $PLATFORM"
    echo "Component: $COMPONENT"
    echo "Skip Tests: $SKIP_TESTS"
    echo "Skip Build: $SKIP_BUILD"
    echo "=========================================="
    echo
    
    read -p "Do you want to proceed with deployment? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Deployment cancelled by user"
        exit 0
    fi
}

# Main deployment function
main() {
    log "Starting BeautyCort deployment..."
    log "Environment: $ENVIRONMENT"
    log "Platform: $PLATFORM"
    log "Component: $COMPONENT"
    
    # Pre-deployment checks
    check_prerequisites
    
    # Confirmation
    confirm_deployment
    
    # Run tests
    run_tests
    
    # Build images (except for mobile)
    if [[ "$COMPONENT" != "mobile" ]]; then
        build_images
    fi
    
    # Deploy based on platform
    case $PLATFORM in
        local)
            deploy_local
            ;;
        aws)
            deploy_aws
            ;;
        gcp)
            deploy_gcp
            ;;
        azure)
            deploy_azure
            ;;
    esac
    
    # Deploy mobile app if needed
    if [[ "$COMPONENT" == "all" || "$COMPONENT" == "mobile" ]]; then
        deploy_mobile
    fi
    
    success "Deployment completed successfully!"
    
    # Show next steps
    echo
    echo "Next Steps:"
    echo "1. Monitor application health"
    echo "2. Run smoke tests"
    echo "3. Check logs for any issues"
    echo "4. Update DNS records if needed"
    echo
}

# Run main function
main