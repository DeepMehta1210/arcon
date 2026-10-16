output "instance_id" {
  description = "EC2 Instance ID for Arcon"
  value       = aws_instance.arcon.id
}

output "public_ip" {
  description = "Elastic Static Public IP"
  value       = aws_eip.arcon.public_ip
}

output "portal_url" {
  description = "Direct Web Portal Address"
  value       = "http://${aws_eip.arcon.public_ip}:3030"
}

output "cloudflare_dns_instruction" {
  description = "DNS record to create in Cloudflare for leads.3dices.com"
  value       = "Create an A record in Cloudflare: 'leads' -> ${aws_eip.arcon.public_ip} with Proxy (orange cloud) ON."
}
