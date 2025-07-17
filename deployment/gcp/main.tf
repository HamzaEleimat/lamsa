# BeautyCort Infrastructure - Google Cloud Platform
# Terraform configuration for deploying BeautyCort on GCP

terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }
}

# Variables
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "production"
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "beautycort"
}

# Provider configuration
provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# Enable required APIs
resource "google_project_service" "required_apis" {
  for_each = toset([
    "cloudresourcemanager.googleapis.com",
    "compute.googleapis.com",
    "container.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "cloudrun.googleapis.com",
    "redis.googleapis.com",
    "secretmanager.googleapis.com",
    "monitoring.googleapis.com",
    "logging.googleapis.com"
  ])
  
  service = each.value
  disable_on_destroy = false
}

# VPC Network
resource "google_compute_network" "vpc" {
  name                    = "${var.environment}-${var.app_name}-vpc"
  auto_create_subnetworks = false
  depends_on             = [google_project_service.required_apis]
}

# Subnet
resource "google_compute_subnetwork" "subnet" {
  name          = "${var.environment}-${var.app_name}-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.vpc.id
  
  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.1.0.0/16"
  }
  
  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.2.0.0/16"
  }
}

# Cloud Router for NAT
resource "google_compute_router" "router" {
  name    = "${var.environment}-${var.app_name}-router"
  region  = var.region
  network = google_compute_network.vpc.id
}

# Cloud NAT
resource "google_compute_router_nat" "nat" {
  name                               = "${var.environment}-${var.app_name}-nat"
  router                             = google_compute_router.router.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
}

# Firewall rules
resource "google_compute_firewall" "allow_internal" {
  name    = "${var.environment}-${var.app_name}-allow-internal"
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }

  source_ranges = ["10.0.0.0/8"]
}

resource "google_compute_firewall" "allow_health_check" {
  name    = "${var.environment}-${var.app_name}-allow-health-check"
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
    ports    = ["8080"]
  }

  source_ranges = ["130.211.0.0/22", "35.191.0.0/16"]
}

# Artifact Registry
resource "google_artifact_registry_repository" "app_repo" {
  location      = var.region
  repository_id = "${var.environment}-${var.app_name}-repo"
  description   = "BeautyCort Docker images"
  format        = "DOCKER"
  depends_on    = [google_project_service.required_apis]
}

# Secret Manager
resource "google_secret_manager_secret" "app_secrets" {
  for_each = toset([
    "supabase-url",
    "supabase-service-key",
    "jwt-secret",
    "tap-secret-key",
    "twilio-auth-token",
    "redis-password"
  ])
  
  secret_id = "${var.environment}-${var.app_name}-${each.value}"
  replication {
    automatic = true
  }
  depends_on = [google_project_service.required_apis]
}

# Redis Instance
resource "google_redis_instance" "cache" {
  name           = "${var.environment}-${var.app_name}-redis"
  memory_size_gb = 1
  region         = var.region
  location_id    = "${var.region}-a"
  
  authorized_network = google_compute_network.vpc.id
  redis_version      = "REDIS_6_X"
  display_name       = "BeautyCort Redis Cache"
  
  auth_enabled = true
  transit_encryption_mode = "SERVER_AUTHENTICATION"
  
  depends_on = [google_project_service.required_apis]
}

# GKE Cluster
resource "google_container_cluster" "primary" {
  name     = "${var.environment}-${var.app_name}-cluster"
  location = var.region
  
  # Remove default node pool
  remove_default_node_pool = true
  initial_node_count       = 1
  
  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.subnet.name
  
  # Enable Workload Identity
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }
  
  # IP allocation policy
  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }
  
  # Master authorized networks
  master_authorized_networks_config {
    cidr_blocks {
      cidr_block   = "0.0.0.0/0"
      display_name = "All networks"
    }
  }
  
  depends_on = [
    google_project_service.required_apis,
    google_compute_subnetwork.subnet
  ]
}

# GKE Node Pool
resource "google_container_node_pool" "primary_nodes" {
  name       = "${var.environment}-${var.app_name}-nodes"
  location   = var.region
  cluster    = google_container_cluster.primary.name
  node_count = 2
  
  node_config {
    preemptible  = true
    machine_type = "e2-standard-2"
    
    # Google recommends custom service accounts with minimal permissions
    service_account = google_service_account.gke_service_account.email
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
    
    # Workload Identity
    workload_metadata_config {
      mode = "GKE_METADATA"
    }
  }
  
  autoscaling {
    min_node_count = 1
    max_node_count = 5
  }
  
  management {
    auto_repair  = true
    auto_upgrade = true
  }
}

# Service Account for GKE
resource "google_service_account" "gke_service_account" {
  account_id   = "${var.environment}-${var.app_name}-gke-sa"
  display_name = "GKE Service Account"
}

# IAM bindings for GKE service account
resource "google_project_iam_binding" "gke_service_account_bindings" {
  for_each = toset([
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/monitoring.viewer",
    "roles/stackdriver.resourceMetadata.writer"
  ])
  
  project = var.project_id
  role    = each.value
  
  members = [
    "serviceAccount:${google_service_account.gke_service_account.email}"
  ]
}

# Cloud Build trigger for API
resource "google_cloudbuild_trigger" "api_trigger" {
  name     = "${var.environment}-${var.app_name}-api-trigger"
  location = var.region
  
  github {
    owner = "your-github-username"
    name  = "beautycort"
    push {
      branch = "main"
    }
  }
  
  build {
    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "build",
        "-t",
        "${google_artifact_registry_repository.app_repo.location}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app_repo.repository_id}/beautycort-api:$COMMIT_SHA",
        "./beautycort-api"
      ]
    }
    
    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "push",
        "${google_artifact_registry_repository.app_repo.location}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app_repo.repository_id}/beautycort-api:$COMMIT_SHA"
      ]
    }
    
    step {
      name = "gcr.io/cloud-builders/gke-deploy"
      args = [
        "run",
        "--filename=deployment/gcp/k8s/api-deployment.yaml",
        "--image=${google_artifact_registry_repository.app_repo.location}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app_repo.repository_id}/beautycort-api:$COMMIT_SHA",
        "--location=${var.region}",
        "--cluster=${google_container_cluster.primary.name}"
      ]
    }
  }
  
  depends_on = [google_project_service.required_apis]
}

# Cloud Run service for Web (alternative to GKE)
resource "google_cloud_run_service" "web_service" {
  name     = "${var.environment}-${var.app_name}-web"
  location = var.region
  
  template {
    spec {
      containers {
        image = "${google_artifact_registry_repository.app_repo.location}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app_repo.repository_id}/beautycort-web:latest"
        
        ports {
          container_port = 3000
        }
        
        env {
          name  = "NODE_ENV"
          value = var.environment
        }
        
        resources {
          limits = {
            cpu    = "1000m"
            memory = "512Mi"
          }
        }
      }
    }
    
    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale" = "1"
        "autoscaling.knative.dev/maxScale" = "10"
        "run.googleapis.com/execution-environment" = "gen2"
      }
    }
  }
  
  traffic {
    percent         = 100
    latest_revision = true
  }
  
  depends_on = [google_project_service.required_apis]
}

# Cloud Run IAM
resource "google_cloud_run_service_iam_binding" "web_service_public" {
  location = google_cloud_run_service.web_service.location
  project  = google_cloud_run_service.web_service.project
  service  = google_cloud_run_service.web_service.name
  role     = "roles/run.invoker"
  
  members = [
    "allUsers"
  ]
}

# Load Balancer
resource "google_compute_global_address" "lb_ip" {
  name = "${var.environment}-${var.app_name}-lb-ip"
}

resource "google_compute_managed_ssl_certificate" "ssl_cert" {
  name = "${var.environment}-${var.app_name}-ssl-cert"
  
  managed {
    domains = ["api.beautycort.com", "dashboard.beautycort.com"]
  }
}

# Outputs
output "cluster_name" {
  description = "GKE cluster name"
  value       = google_container_cluster.primary.name
}

output "cluster_location" {
  description = "GKE cluster location"
  value       = google_container_cluster.primary.location
}

output "artifact_registry_url" {
  description = "Artifact Registry URL"
  value       = "${google_artifact_registry_repository.app_repo.location}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app_repo.repository_id}"
}

output "redis_host" {
  description = "Redis host"
  value       = google_redis_instance.cache.host
}

output "redis_port" {
  description = "Redis port"
  value       = google_redis_instance.cache.port
}

output "web_service_url" {
  description = "Cloud Run web service URL"
  value       = google_cloud_run_service.web_service.status[0].url
}

output "load_balancer_ip" {
  description = "Load Balancer IP"
  value       = google_compute_global_address.lb_ip.address
}