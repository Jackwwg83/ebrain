# Purpose: declares PM-supplied values for the Stage A5 Alibaba Cloud templates.

variable "region" {
  description = "Alibaba Cloud region for dev resources."
  type        = string
  default     = "cn-shanghai"
}

variable "zone_id" {
  description = "Primary zone for ACK, RDS, NAS, and SLB resources."
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR for the Ebrain dev VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "vswitch_cidr" {
  description = "CIDR for the Ebrain dev ACK worker vSwitch."
  type        = string
  default     = "10.0.1.0/24"
}

variable "ack_worker_instance_type" {
  description = "Dev worker shape; Stage A5 target is one 4C8G node."
  type        = string
  default     = "ecs.g7.xlarge"
}

variable "rds_instance_type" {
  description = "RDS PostgreSQL dev shape; Stage A5 target is 4C16G."
  type        = string
  default     = "pg.x4.large.2"
}

variable "rds_admin_password" {
  description = "Initial RDS password. Store the final DATABASE_URL in KMS, not Helm values."
  type        = string
  sensitive   = true
}

variable "domain_name" {
  description = "Dev public host, for example ebrain-dev.your-company.com."
  type        = string
  default     = "ebrain-dev.your-company.com"
}
