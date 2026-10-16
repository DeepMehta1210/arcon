# 1. Lookup Default VPC & Subnets
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# 2. Lookup Latest Official Ubuntu 24.04 LTS AMI (ARM64 or x86_64)
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-*"]
  }

  filter {
    name   = "architecture"
    values = [startswith(var.instance_type, "t4g") ? "arm64" : "x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# 3. Security Group for Arcon Host
resource "aws_security_group" "arcon" {
  name        = "${var.app_name}-${var.environment}-sg"
  description = "Security group for Arcon Growth Platform"
  vpc_id      = data.aws_vpc.default.id

  # Inbound: Web Traffic (Can be proxied through Cloudflare)
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Arcon Web Portal"
    from_port   = 3030
    to_port     = 3030
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Outbound: Unrestricted (Essential for port 25 SMTP verification & scrapers)
  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  tags = {
    Name = "${var.app_name}-sg"
  }
}

# 4. IAM Role & Instance Profile for EC2 Host (quant-lab prefix matches IAM permissions)
resource "aws_iam_role" "arcon_ec2" {
  name = "quant-lab-${var.app_name}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

# Attach AWS SSM (for CI/CD without opening SSH ports)
resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.arcon_ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Attach Amazon Bedrock (for AI AgentCore inference)
resource "aws_iam_role_policy_attachment" "bedrock" {
  role       = aws_iam_role.arcon_ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonBedrockFullAccess"
}

# 5. EC2 Instance (Free Tier Eligible)
resource "aws_instance" "arcon" {
  ami                  = data.aws_ami.ubuntu.id
  instance_type        = var.instance_type
  subnet_id            = element(data.aws_subnets.default.ids, 0)
  iam_instance_profile = var.iam_instance_profile
  vpc_security_group_ids = [aws_security_group.arcon.id]

  root_block_device {
    volume_size           = 30 # AWS Free Tier gives 30 GB gp3 storage
    volume_type           = "gp3"
    delete_on_termination = true
  }

  user_data = templatefile("${path.module}/user_data.sh", {
    jwt_secret     = var.jwt_secret
    admin_password = var.admin_password
  })

  tags = {
    Name        = "arcon-production"
    App         = "arcon"
    Environment = "production"
  }
}

# 6. Static Elastic IP (Never changes across reboots)
resource "aws_eip" "arcon" {
  instance = aws_instance.arcon.id
  domain   = "vpc"

  tags = {
    Name = "arcon-eip"
    App  = "arcon"
  }
}
