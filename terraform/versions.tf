terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "quant-lab-tfstate-115044045469"
    key    = "arcon/production/terraform.tfstate"
    region = "ap-south-1"
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      App         = "arcon"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
