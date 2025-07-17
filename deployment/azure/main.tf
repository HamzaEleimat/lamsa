# BeautyCort Infrastructure - Microsoft Azure
# Terraform configuration for deploying BeautyCort on Azure

terraform {
  required_version = ">= 1.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

# Variables
variable "resource_group_name" {
  description = "Resource group name"
  type        = string
  default     = "beautycort-rg"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "East US"
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
provider "azurerm" {
  features {}
}

# Resource Group
resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location
  
  tags = {
    Environment = var.environment
    Application = var.app_name
  }
}

# Virtual Network
resource "azurerm_virtual_network" "main" {
  name                = "${var.environment}-${var.app_name}-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  
  tags = {
    Environment = var.environment
    Application = var.app_name
  }
}

# Subnet for AKS
resource "azurerm_subnet" "aks" {
  name                 = "${var.environment}-${var.app_name}-aks-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]
}

# Subnet for Application Gateway
resource "azurerm_subnet" "appgw" {
  name                 = "${var.environment}-${var.app_name}-appgw-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.2.0/24"]
}

# Public IP for Application Gateway
resource "azurerm_public_ip" "appgw" {
  name                = "${var.environment}-${var.app_name}-appgw-ip"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  allocation_method   = "Static"
  sku                 = "Standard"
  
  tags = {
    Environment = var.environment
    Application = var.app_name
  }
}

# Azure Container Registry
resource "azurerm_container_registry" "main" {
  name                = "${var.environment}${var.app_name}acr"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Basic"
  admin_enabled       = true
  
  tags = {
    Environment = var.environment
    Application = var.app_name
  }
}

# Log Analytics Workspace
resource "azurerm_log_analytics_workspace" "main" {
  name                = "${var.environment}-${var.app_name}-law"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  
  tags = {
    Environment = var.environment
    Application = var.app_name
  }
}

# Application Insights
resource "azurerm_application_insights" "main" {
  name                = "${var.environment}-${var.app_name}-ai"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  workspace_id        = azurerm_log_analytics_workspace.main.id
  application_type    = "web"
  
  tags = {
    Environment = var.environment
    Application = var.app_name
  }
}

# AKS Cluster
resource "azurerm_kubernetes_cluster" "main" {
  name                = "${var.environment}-${var.app_name}-aks"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  dns_prefix          = "${var.environment}-${var.app_name}"
  
  default_node_pool {
    name       = "default"
    node_count = 2
    vm_size    = "Standard_D2s_v3"
    vnet_subnet_id = azurerm_subnet.aks.id
    
    enable_auto_scaling = true
    min_count          = 1
    max_count          = 5
  }
  
  identity {
    type = "SystemAssigned"
  }
  
  oms_agent {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  }
  
  network_profile {
    network_plugin = "azure"
    network_policy = "azure"
  }
  
  tags = {
    Environment = var.environment
    Application = var.app_name
  }
}

# Role assignment for AKS to pull from ACR
resource "azurerm_role_assignment" "aks_acr" {
  scope                = azurerm_container_registry.main.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
}

# Redis Cache
resource "azurerm_redis_cache" "main" {
  name                = "${var.environment}-${var.app_name}-redis"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  capacity            = 1
  family              = "C"
  sku_name            = "Standard"
  enable_non_ssl_port = false
  minimum_tls_version = "1.2"
  
  redis_configuration {
    enable_authentication = true
  }
  
  tags = {
    Environment = var.environment
    Application = var.app_name
  }
}

# Key Vault
resource "azurerm_key_vault" "main" {
  name                = "${var.environment}-${var.app_name}-kv"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  
  sku_name = "standard"
  
  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id
    
    secret_permissions = [
      "Get",
      "List",
      "Set",
      "Delete",
      "Recover",
      "Backup",
      "Restore"
    ]
  }
  
  tags = {
    Environment = var.environment
    Application = var.app_name
  }
}

# Get current client configuration
data "azurerm_client_config" "current" {}

# Key Vault Secrets
resource "azurerm_key_vault_secret" "secrets" {
  for_each = {
    "supabase-url"        = "https://your-project.supabase.co"
    "supabase-service-key" = "your_service_key_here"
    "jwt-secret"          = "your_jwt_secret_here"
    "tap-secret-key"      = "your_tap_secret_key"
    "twilio-auth-token"   = "your_twilio_auth_token"
  }
  
  name         = each.key
  value        = each.value
  key_vault_id = azurerm_key_vault.main.id
  
  tags = {
    Environment = var.environment
    Application = var.app_name
  }
}

# Application Gateway
resource "azurerm_application_gateway" "main" {
  name                = "${var.environment}-${var.app_name}-appgw"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  
  sku {
    name     = "Standard_v2"
    tier     = "Standard_v2"
    capacity = 2
  }
  
  gateway_ip_configuration {
    name      = "gateway-ip-config"
    subnet_id = azurerm_subnet.appgw.id
  }
  
  frontend_port {
    name = "http-port"
    port = 80
  }
  
  frontend_port {
    name = "https-port"
    port = 443
  }
  
  frontend_ip_configuration {
    name                 = "frontend-ip-config"
    public_ip_address_id = azurerm_public_ip.appgw.id
  }
  
  backend_address_pool {
    name = "api-backend-pool"
  }
  
  backend_address_pool {
    name = "web-backend-pool"
  }
  
  backend_http_settings {
    name                  = "api-backend-settings"
    cookie_based_affinity = "Disabled"
    path                  = "/"
    port                  = 80
    protocol              = "Http"
    request_timeout       = 30
    
    probe_name = "api-health-probe"
  }
  
  backend_http_settings {
    name                  = "web-backend-settings"
    cookie_based_affinity = "Disabled"
    path                  = "/"
    port                  = 80
    protocol              = "Http"
    request_timeout       = 30
    
    probe_name = "web-health-probe"
  }
  
  probe {
    name                = "api-health-probe"
    protocol            = "Http"
    path                = "/api/health"
    host                = "api.beautycort.com"
    interval            = 30
    timeout             = 5
    unhealthy_threshold = 3
    
    match {
      status_code = ["200-399"]
    }
  }
  
  probe {
    name                = "web-health-probe"
    protocol            = "Http"
    path                = "/api/health"
    host                = "dashboard.beautycort.com"
    interval            = 30
    timeout             = 5
    unhealthy_threshold = 3
    
    match {
      status_code = ["200-399"]
    }
  }
  
  http_listener {
    name                           = "api-listener"
    frontend_ip_configuration_name = "frontend-ip-config"
    frontend_port_name             = "http-port"
    protocol                       = "Http"
    host_name                      = "api.beautycort.com"
  }
  
  http_listener {
    name                           = "web-listener"
    frontend_ip_configuration_name = "frontend-ip-config"
    frontend_port_name             = "http-port"
    protocol                       = "Http"
    host_name                      = "dashboard.beautycort.com"
  }
  
  request_routing_rule {
    name                       = "api-routing-rule"
    rule_type                  = "Basic"
    http_listener_name         = "api-listener"
    backend_address_pool_name  = "api-backend-pool"
    backend_http_settings_name = "api-backend-settings"
    priority                   = 100
  }
  
  request_routing_rule {
    name                       = "web-routing-rule"
    rule_type                  = "Basic"
    http_listener_name         = "web-listener"
    backend_address_pool_name  = "web-backend-pool"
    backend_http_settings_name = "web-backend-settings"
    priority                   = 101
  }
  
  tags = {
    Environment = var.environment
    Application = var.app_name
  }
}

# Storage Account for logs and static content
resource "azurerm_storage_account" "main" {
  name                     = "${var.environment}${var.app_name}sa"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  
  tags = {
    Environment = var.environment
    Application = var.app_name
  }
}

# App Service Plan for Container Apps (alternative to AKS)
resource "azurerm_service_plan" "main" {
  name                = "${var.environment}-${var.app_name}-asp"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  os_type             = "Linux"
  sku_name            = "P1v2"
  
  tags = {
    Environment = var.environment
    Application = var.app_name
  }
}

# Container App Environment
resource "azurerm_container_app_environment" "main" {
  name                       = "${var.environment}-${var.app_name}-env"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  
  tags = {
    Environment = var.environment
    Application = var.app_name
  }
}

# Container App for API
resource "azurerm_container_app" "api" {
  name                         = "${var.environment}-${var.app_name}-api"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"
  
  template {
    container {
      name   = "beautycort-api"
      image  = "${azurerm_container_registry.main.login_server}/beautycort-api:latest"
      cpu    = 0.5
      memory = "1Gi"
      
      env {
        name  = "NODE_ENV"
        value = var.environment
      }
      
      env {
        name        = "REDIS_URL"
        secret_name = "redis-connection-string"
      }
    }
    
    min_replicas = 1
    max_replicas = 10
  }
  
  secret {
    name  = "redis-connection-string"
    value = azurerm_redis_cache.main.primary_connection_string
  }
  
  ingress {
    allow_insecure_connections = false
    external_enabled           = true
    target_port                = 3000
    
    traffic_weight {
      percentage = 100
      latest_revision = true
    }
  }
  
  registry {
    server               = azurerm_container_registry.main.login_server
    username             = azurerm_container_registry.main.admin_username
    password_secret_name = "acr-password"
  }
  
  secret {
    name  = "acr-password"
    value = azurerm_container_registry.main.admin_password
  }
  
  tags = {
    Environment = var.environment
    Application = var.app_name
  }
}

# Container App for Web
resource "azurerm_container_app" "web" {
  name                         = "${var.environment}-${var.app_name}-web"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"
  
  template {
    container {
      name   = "beautycort-web"
      image  = "${azurerm_container_registry.main.login_server}/beautycort-web:latest"
      cpu    = 0.5
      memory = "1Gi"
      
      env {
        name  = "NODE_ENV"
        value = var.environment
      }
    }
    
    min_replicas = 1
    max_replicas = 5
  }
  
  ingress {
    allow_insecure_connections = false
    external_enabled           = true
    target_port                = 3000
    
    traffic_weight {
      percentage = 100
      latest_revision = true
    }
  }
  
  registry {
    server               = azurerm_container_registry.main.login_server
    username             = azurerm_container_registry.main.admin_username
    password_secret_name = "acr-password"
  }
  
  secret {
    name  = "acr-password"
    value = azurerm_container_registry.main.admin_password
  }
  
  tags = {
    Environment = var.environment
    Application = var.app_name
  }
}

# Outputs
output "resource_group_name" {
  description = "Resource group name"
  value       = azurerm_resource_group.main.name
}

output "aks_cluster_name" {
  description = "AKS cluster name"
  value       = azurerm_kubernetes_cluster.main.name
}

output "acr_login_server" {
  description = "ACR login server"
  value       = azurerm_container_registry.main.login_server
}

output "redis_hostname" {
  description = "Redis hostname"
  value       = azurerm_redis_cache.main.hostname
}

output "redis_port" {
  description = "Redis port"
  value       = azurerm_redis_cache.main.port
}

output "application_gateway_ip" {
  description = "Application Gateway public IP"
  value       = azurerm_public_ip.appgw.ip_address
}

output "key_vault_uri" {
  description = "Key Vault URI"
  value       = azurerm_key_vault.main.vault_uri
}

output "api_container_app_url" {
  description = "API Container App URL"
  value       = azurerm_container_app.api.latest_revision_fqdn
}

output "web_container_app_url" {
  description = "Web Container App URL"
  value       = azurerm_container_app.web.latest_revision_fqdn
}