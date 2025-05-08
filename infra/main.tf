###############################################################################
#  GLOBAL REQUIREMENTS
###############################################################################
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

###############################################################################
# VARIABLES
###############################################################################

variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-west-2"
}

variable "db_password" {
  description = "Master password for RDS (8–128 printable ASCII, no / @ \" space)"
  type        = string
  sensitive   = true
}

variable "domain_name" {
  description = "Optional FQDN for public HTTPS (e.g. api.example.com). Leave blank to skip ACM/Route53."
  type        = string
  default     = ""
}

variable "secret_key" {
  description = "Secret key for FastAPI (used by Pydantic Settings)"
  type        = string
  sensitive   = true
}

variable "aws_access_key_id" {
  description = "AWS Access Key ID (for S3, if not using instance role)"
  type        = string
  sensitive   = true
}

variable "aws_secret_access_key" {
  description = "AWS Secret Access Key (for S3, if not using instance role)"
  type        = string
  sensitive   = true
}

###############################################################################
#  LOOKUPS & HELPERS
###############################################################################
data "aws_vpcs" "default" {
  filter {
    name   = "isDefault"
    values = ["true"]
  }
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpcs.default.ids[0]]
  }
}

# unique suffix for S3 buckets
resource "random_id" "this" {
  byte_length = 4
}

###############################################################################
#  EXISTING ELASTIC BEANSTALK ROLES
###############################################################################
data "aws_iam_role" "eb_service" {
  name = "aws-elasticbeanstalk-service-role"
}

data "aws_iam_role" "eb_ec2" {
  name = "aws-elasticbeanstalk-ec2-role"
}

###############################################################################
#  SECURITY GROUPS
###############################################################################
resource "aws_security_group" "alb" {
  name        = "alb-sg"
  description = "Allow HTTP/HTTPS from the world"
  vpc_id      = data.aws_vpcs.default.ids[0]

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "eb" {
  name        = "eb-sg"
  description = "Elastic Beanstalk instances"
  vpc_id      = data.aws_vpcs.default.ids[0]
}

resource "aws_security_group" "rds" {
  name        = "rds-sg"
  description = "Allow Postgres inbound from EB + optional laptop"
  vpc_id      = data.aws_vpcs.default.ids[0]

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.eb.id]
  }

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["35.149.50.23/32"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    prevent_destroy = true # never delete this SG
    ignore_changes = [
      description, # don’t replace on desc tweak
      tags,
      name
    ]
  }
}

###############################################################################
#  POSTGRES RDS
###############################################################################
resource "aws_db_subnet_group" "db" {
  name       = "rds-subnets"
  subnet_ids = data.aws_subnets.default.ids
}

resource "aws_db_instance" "postgres" {
  identifier          = "energy-db"
  engine              = "postgres"
  engine_version      = "16.5"
  instance_class      = "db.t4g.micro"
  allocated_storage   = 20
  db_name             = "energy"
  username            = "postgres"
  password            = var.db_password
  skip_final_snapshot = true
  publicly_accessible = true

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.db.name

  lifecycle {
    prevent_destroy = true
    ignore_changes = [
      # list any fields you don’t want Terraform to ever touch
      # e.g. allocated_storage, engine_version, etc.
    ]
  }
}

###############################################################################
#  STATIC FRONTEND – S3 WEBSITE
###############################################################################
resource "aws_s3_bucket" "frontend" {
  bucket        = "energy-dashboard-frontend-${random_id.this.hex}"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket                  = aws_s3_bucket.frontend.id
  block_public_policy     = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  index_document {
    suffix = "index.html"
  }


  # instead of error_document, use SPA routing rules:
  routing_rules = <<ROUTING
  [
    {
      "Condition": {
        "HttpErrorCodeReturnedEquals": "404"
      },
      "Redirect": {
        "ReplaceKeyWith": "index.html"
      }
    },
    {
      "Condition": {
        "HttpErrorCodeReturnedEquals": "403"
      },
      "Redirect": {
        "ReplaceKeyWith": "index.html"
      }
    }
  ]
  ROUTING
}

resource "aws_s3_bucket_policy" "frontend_public" {
  bucket = aws_s3_bucket.frontend.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.frontend.arn}/*"
    }]
  })
}

# Front your SPA bucket’s website endpoint
resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100" # US, Canada & Europe

  # 1) Origin: your S3 *website* host (not the REST API)
  origin {
    domain_name = "${aws_s3_bucket.frontend.bucket}.s3-website-us-west-2.amazonaws.com"
    origin_id   = "S3-Website-Origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # 2) Default behavior: only GET/HEAD, redirect-to-https
  default_cache_behavior {
    target_origin_id       = "S3-Website-Origin"
    viewer_protocol_policy = "redirect-to-https"

    allowed_methods = ["GET", "HEAD", "OPTIONS"]
    cached_methods  = ["GET", "HEAD"]

    forwarded_values {
      query_string = false
      cookies {
        forward = "all"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  # 3) Catch-all: if origin returns 403/404, serve index.html with 200
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  # 4) No geo restrictions
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # 5) Use the default CloudFront certificate (HTTPS)
  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Environment = "prod"
    Project     = "energy-dashboard-frontend"
  }
}

###############################################################################
#  CloudFront for API – HTTPS + Session Cookies
###############################################################################
resource "aws_cloudfront_response_headers_policy" "api_cors" {
  name    = "energy-api-cors"
  comment = "CORS policy for Energy Dashboard API"

  cors_config {
    # must be specified
    access_control_allow_credentials = true
    origin_override                  = true

    access_control_allow_origins {
      items = [
        "https://${aws_cloudfront_distribution.frontend.domain_name}",
        # if you still need to support raw S3 site:
        "http://${aws_s3_bucket.frontend.bucket}.s3-website-${var.aws_region}.amazonaws.com"
      ]
    }

    access_control_allow_methods {
      items = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    }

    access_control_allow_headers {
      items = [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Accept",
        "Origin"
      ]
    }
  }
}

resource "aws_cloudfront_distribution" "api" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "" # API has no “index.html”
  price_class         = "PriceClass_100"

  origin {
    # point at your EB environment’s CNAME
    domain_name = aws_elastic_beanstalk_environment.env.cname
    origin_id   = "EB-API-Origin"

    # pull via HTTP from EB, but serve HTTPS to clients
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = "EB-API-Origin"
    viewer_protocol_policy = "redirect-to-https"

    # allow all typical API methods
    allowed_methods = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods  = ["GET", "HEAD"]

    # forward everything your app might need 
    forwarded_values {
      query_string = true
      cookies {
        forward = "all"
      }
      headers = ["*"]
    }

    response_headers_policy_id = aws_cloudfront_response_headers_policy.api_cors.id

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  # use the built-in CloudFront cert on *.cloudfront.net
  viewer_certificate {
    cloudfront_default_certificate = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = {
    Environment = "prod"
    Project     = "energy-dashboard-api"
  }
}


###############################################################################
#  OPTIONAL ACM + ROUTE53 FOR HTTPS
###############################################################################
resource "aws_acm_certificate" "cert" {
  count             = var.domain_name == "" ? 0 : 1
  domain_name       = var.domain_name
  validation_method = "DNS"
}

resource "aws_route53_zone" "zone" {
  count = var.domain_name == "" ? 0 : 1
  name  = join(".", slice(split(".", var.domain_name), 1, length(split(".", var.domain_name))))
}

resource "aws_route53_record" "cert_validation" {
  count = var.domain_name == "" ? 0 : length(aws_acm_certificate.cert[0].domain_validation_options)

  zone_id = aws_route53_zone.zone[0].zone_id
  name    = aws_acm_certificate.cert[0].domain_validation_options[count.index].resource_record_name
  type    = aws_acm_certificate.cert[0].domain_validation_options[count.index].resource_record_type
  records = [aws_acm_certificate.cert[0].domain_validation_options[count.index].resource_record_value]
  ttl     = 300
}

resource "aws_acm_certificate_validation" "cert_validation" {
  count                   = var.domain_name == "" ? 0 : 1
  certificate_arn         = aws_acm_certificate.cert[0].arn
  validation_record_fqdns = aws_route53_record.cert_validation[*].fqdn
}

###############################################################################
#  BACKEND – ELASTIC BEANSTALK
###############################################################################
resource "aws_elastic_beanstalk_application" "app" {
  name        = "energy-dashboard"
  description = "FastAPI Energy Dashboard"
}

resource "aws_s3_bucket" "code" {
  bucket        = "energy-dashboard-code-${random_id.this.hex}"
  force_destroy = true
}

resource "aws_s3_object" "app_zip" {
  bucket = aws_s3_bucket.code.id
  key    = "fastapi-app.zip"
  # source = "${path.module}/../backend/deploy/fastapi-app.zip"
  # etag   = filemd5("${path.module}/../backend/deploy/fastapi-app.zip")
  source = "${path.module}/../fastapi-app.zip"
  etag   = filemd5("${path.module}/../fastapi-app.zip")
}

resource "aws_elastic_beanstalk_application_version" "version" {
  name        = "v${timestamp()}"
  application = aws_elastic_beanstalk_application.app.name
  bucket      = aws_s3_bucket.code.id
  key         = aws_s3_object.app_zip.key
}

resource "aws_elastic_beanstalk_environment" "env" {
  name                = "energy-dashboard-env"
  application         = aws_elastic_beanstalk_application.app.name
  solution_stack_name = "64bit Amazon Linux 2 v4.1.1 running Docker"
  version_label       = aws_elastic_beanstalk_application_version.version.name

  setting {
    namespace = "aws:ec2:vpc"
    name      = "VPCId"
    value     = data.aws_vpcs.default.ids[0]
  }
  setting {
    namespace = "aws:ec2:vpc"
    name      = "Subnets"
    value     = join(",", data.aws_subnets.default.ids)
  }
  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "SecurityGroups"
    value     = aws_security_group.eb.id
  }
  setting {
    namespace = "aws:elbv2:loadbalancer"
    name      = "SecurityGroups"
    value     = aws_security_group.alb.id
  }
  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name      = "ServiceRole"
    value     = data.aws_iam_role.eb_service.arn
  }
  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "IamInstanceProfile"
    value     = data.aws_iam_role.eb_ec2.name
  }
  setting {
    namespace = "aws:elasticbeanstalk:environment:process:default"
    name      = "Port"
    value     = "8000"
  }
  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name      = "EnvironmentType"
    value     = "LoadBalanced"
  }
  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "DATABASE_URL"
    value     = "postgresql+asyncpg://postgres:${var.db_password}@${aws_db_instance.postgres.address}:${aws_db_instance.postgres.port}/energy"
  }
  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "SECRET_KEY"
    value     = var.secret_key
  }
  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "AWS_ACCESS_KEY_ID"
    value     = var.aws_access_key_id
  }
  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "AWS_SECRET_ACCESS_KEY"
    value     = var.aws_secret_access_key
  }
  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "S3_BUCKET"
    value     = aws_s3_bucket.frontend.bucket
  }

  setting {
    namespace = "aws:elasticbeanstalk:managedactions"
    name      = "ManagedActionsEnabled"
    value     = "false"
  }

  dynamic "setting" {
    for_each = var.domain_name == "" ? [] : [
      { namespace = "aws:elbv2:listener:443", name = "Protocol", value = "HTTPS" },
      { namespace = "aws:elbv2:listener:443", name = "SSLCertificateArns", value = aws_acm_certificate.cert[0].arn }
    ]
    content {
      namespace = setting.value.namespace
      name      = setting.value.name
      value     = setting.value.value
    }
  }

  wait_for_ready_timeout = "20m"
}

###############################################################################
#  OUTPUTS
###############################################################################
output "rds_endpoint" { value = aws_db_instance.postgres.endpoint }
output "beanstalk_url" { value = aws_elastic_beanstalk_environment.env.endpoint_url }

output "frontend_url" {
  value = "http://${aws_s3_bucket.frontend.bucket}.s3-website-${var.aws_region}.amazonaws.com"
}

output "cloudfront_domain_name" {
  description = "CloudFront domain for the SPA"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "api_cloudfront_domain" {
  description = "HTTPS endpoint for the API via CloudFront"
  value       = aws_cloudfront_distribution.api.domain_name
}