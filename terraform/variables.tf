variable "aws_region" {
  description = "AWS deployment region"
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "instance_type" {
  description = "EC2 instance size (t4g.micro for AWS Graviton ARM Free Tier, or t3.micro for x86)"
  type        = string
  default     = "t4g.micro"
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "arcon"
}

variable "admin_password" {
  description = "Admin password for Arcon portal"
  type        = string
  default     = "ArconAdmin2026!"
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT encryption key for portal session auth"
  type        = string
  default     = "arcon-super-secure-production-jwt-key-2026"
  sensitive   = true
}

variable "iam_instance_profile" {
  description = "Optional IAM instance profile name for EC2 host"
  type        = string
  default     = null
}
