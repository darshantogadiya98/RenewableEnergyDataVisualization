# terraform {
#   required_providers {
#     aws = {
#       source  = "hashicorp/aws"
#       version = "~> 5.0"
#     }
#   }
#   required_version = ">= 1.0"
# }

# ################
# #  PROVIDER
# ################
# provider "aws" {
#   region = var.aws_region
# }

# ################
# #  VARIABLES
# ################
# variable "aws_region" {
#   type    = string
#   default = "us-west-2"
# }

# variable "db_password" {
#   type        = string
#   description = "Master password for the RDS instance"
# }

# variable "domain_name" {
#   type        = string
#   default     = ""
#   description = "Optional FQDN for ACM/Route53 (e.g. api.example.com)"
# }

# ########################
# #  NETWORK LOOK‑UPS
# ########################
# data "aws_vpcs" "default" {
#   filter {
#     name   = "isDefault"
#     values = ["true"]
#   }
# }

# data "aws_subnets" "default" {
#   filter {
#     name   = "vpc-id"
#     values = [data.aws_vpcs.default.ids[0]]
#   }
# }

# ########################
# #  IAM ROLES FOR EB
# ########################
# ## Service role
# data "aws_iam_policy_document" "eb_service_assume" {
#   statement {
#     actions = ["sts:AssumeRole"]
#     principals {
#       type        = "Service"
#       identifiers = ["elasticbeanstalk.amazonaws.com"]
#     }
#   }
# }

# resource "aws_iam_role" "eb_service" {
#   name               = "aws-elasticbeanstalk-service-role"
#   assume_role_policy = data.aws_iam_policy_document.eb_service_assume.json
# }

# resource "aws_iam_role_policy_attachment" "eb_service_attach" {
#   role       = aws_iam_role.eb_service.name
#   policy_arn = "arn:aws:iam::aws:policy/service-role/AWSElasticBeanstalkEnhancedHealth"
# }

# ## EC2 instance role + profile
# data "aws_iam_policy_document" "eb_ec2_assume" {
#   statement {
#     actions = ["sts:AssumeRole"]
#     principals {
#       type        = "Service"
#       identifiers = ["ec2.amazonaws.com"]
#     }
#   }
# }

# resource "aws_iam_role" "eb_ec2" {
#   name               = "aws-elasticbeanstalk-ec2-role"
#   assume_role_policy = data.aws_iam_policy_document.eb_ec2_assume.json
# }

# resource "aws_iam_role_policy_attachment" "eb_ec2_attach" {
#   role       = aws_iam_role.eb_ec2.name
#   policy_arn = "arn:aws:iam::aws:policy/AWSElasticBeanstalkWebTier"
# }

# resource "aws_iam_instance_profile" "eb_profile" {
#   name = "aws-elasticbeanstalk-ec2-role"
#   role = aws_iam_role.eb_ec2.name
# }

# ########################
# #  SECURITY GROUPS
# ########################
# resource "aws_security_group" "alb" {
#   name        = "alb-sg"
#   description = "Allow HTTP/HTTPS"
#   vpc_id      = data.aws_vpcs.default.ids[0]

#   ingress {
#     from_port   = 80
#     to_port     = 80
#     protocol    = "tcp"
#     cidr_blocks = ["0.0.0.0/0"]
#   }
#   ingress {
#     from_port   = 443
#     to_port     = 443
#     protocol    = "tcp"
#     cidr_blocks = ["0.0.0.0/0"]
#   }
#   egress {
#     from_port   = 0
#     to_port     = 0
#     protocol    = "-1"
#     cidr_blocks = ["0.0.0.0/0"]
#   }
# }

# resource "aws_security_group" "eb" {
#   name        = "eb-sg"
#   description = "Instances in Elastic Beanstalk"
#   vpc_id      = data.aws_vpcs.default.ids[0]
# }

# resource "aws_security_group" "rds" {
#   name        = "rds-sg"
#   description = "Allow Postgres from EB"
#   vpc_id      = data.aws_vpcs.default.ids[0]

#   ingress {
#     from_port       = 5432
#     to_port         = 5432
#     protocol        = "tcp"
#     security_groups = [aws_security_group.eb.id]
#   }
#   egress {
#     from_port   = 0
#     to_port     = 0
#     protocol    = "-1"
#     cidr_blocks = ["0.0.0.0/0"]
#   }
# }

# ########################
# #  RDS POSTGRES
# ########################
# resource "aws_db_subnet_group" "db_subnets" {
#   name       = "rds-subnets"
#   subnet_ids = data.aws_subnets.default.ids
# }

# resource "aws_db_instance" "postgres" {
#   identifier              = "energy-db"
#   engine                  = "postgres"
#   engine_version          = "16.5"
#   instance_class          = "db.t4g.micro"
#   allocated_storage       = 20
#   db_name                 = "energy"
#   username                = "postgres"
#   password                = var.db_password
#   skip_final_snapshot     = true
#   publicly_accessible     = true

#   vpc_security_group_ids = [aws_security_group.rds.id]
#   db_subnet_group_name   = aws_db_subnet_group.db_subnets.name
# }

# ########################
# #  ACM & ROUTE 53 (optional HTTPS)
# ########################
# resource "aws_acm_certificate" "cert" {
#   count             = var.domain_name == "" ? 0 : 1
#   domain_name       = var.domain_name
#   validation_method = "DNS"
# }

# resource "aws_route53_zone" "zone" {
#   count = var.domain_name == "" ? 0 : 1
#   name  = join(".", slice(split(".", var.domain_name), 1, length(split(".", var.domain_name))))
# }

# resource "aws_route53_record" "cert_validation" {
#   count = var.domain_name == "" ? 0 : length(aws_acm_certificate.cert[0].domain_validation_options)

#   zone_id = aws_route53_zone.zone[0].zone_id
#   name    = tolist(aws_acm_certificate.cert[0].domain_validation_options)[count.index].resource_record_name
#   type    = tolist(aws_acm_certificate.cert[0].domain_validation_options)[count.index].resource_record_type
#   records = [tolist(aws_acm_certificate.cert[0].domain_validation_options)[count.index].resource_record_value]
#   ttl     = 300
# }

# resource "aws_acm_certificate_validation" "cert_validation" {
#   count                   = var.domain_name == "" ? 0 : 1
#   certificate_arn         = aws_acm_certificate.cert[0].arn
#   validation_record_fqdns = aws_route53_record.cert_validation[*].fqdn
# }

# ########################
# #  ELASTIC BEANSTALK
# ########################
# resource "aws_elastic_beanstalk_application" "app" {
#   name        = "energy-dashboard"
#   description = "FastAPI Energy Dashboard"
# }

# resource "aws_elastic_beanstalk_environment" "env" {
#   name                = "energy-dashboard-env"
#   application         = aws_elastic_beanstalk_application.app.name
#   solution_stack_name = "64bit Amazon Linux 2 v4.1.1 running Docker"

#   # VPC & subnets
#   setting {
#     namespace = "aws:ec2:vpc"
#     name      = "VPCId"
#     value     = data.aws_vpcs.default.ids[0]
#   }
#   setting {
#     namespace = "aws:ec2:vpc"
#     name      = "Subnets"
#     value     = join(",", data.aws_subnets.default.ids)
#   }

#   # Custom security groups
#   setting {
#     namespace = "aws:autoscaling:launchconfiguration"
#     name      = "SecurityGroups"
#     value     = aws_security_group.eb.id
#   }
#   setting {
#     namespace = "aws:elbv2:loadbalancer"
#     name      = "SecurityGroups"
#     value     = aws_security_group.alb.id
#   }

#   # IAM roles
#   setting {
#     namespace = "aws:elasticbeanstalk:environment"
#     name      = "ServiceRole"
#     value     = aws_iam_role.eb_service.arn
#   }
#   setting {
#     namespace = "aws:autoscaling:launchconfiguration"
#     name      = "IamInstanceProfile"
#     value     = aws_iam_instance_profile.eb_profile.name
#   }

#   # Container port & env type
#   setting {
#     namespace = "aws:elasticbeanstalk:environment:process:default"
#     name      = "Port"
#     value     = "8000"
#   }
#   setting {
#     namespace = "aws:elasticbeanstalk:environment"
#     name      = "EnvironmentType"
#     value     = "LoadBalanced"
#   }

#   # HTTPS listener if cert present
#   dynamic "setting" {
#     for_each = var.domain_name == "" ? [] : [
#       {
#         namespace = "aws:elbv2:listener:443"
#         name      = "Protocol"
#         value     = "HTTPS"
#       },
#       {
#         namespace = "aws:elbv2:listener:443"
#         name      = "SSLCertificateArns"
#         value     = aws_acm_certificate.cert[0].arn
#       }
#     ]
#     content {
#       namespace = setting.value.namespace
#       name      = setting.value.name
#       value     = setting.value.value
#     }
#   }

#   wait_for_ready_timeout = "20m"
# }

# ################
# #  OUTPUTS
# ################
# output "rds_endpoint" {
#   value = aws_db_instance.postgres.endpoint
# }

# output "beanstalk_url" {
#   value = aws_elastic_beanstalk_environment.env.endpoint_url
# }




terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  required_version = ">= 1.0"
}

provider "aws" {
  region = var.aws_region
}

########################
# VARIABLES
########################
variable "aws_region" {
  type    = string
  default = "us-west-2"
}

variable "db_password" {
  type        = string
  description = "Master password for RDS (8–128 printable ASCII, no / @ \" space)"
}

variable "domain_name" {
  type        = string
  default     = ""
  description = "Optional FQDN for ACM/Route53 (e.g. api.example.com)"
}

########################
# NETWORK LOOKUPS
########################
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

########################
# IMPORT EXISTING EB ROLES
########################
data "aws_iam_role" "eb_service" {
  name = "aws-elasticbeanstalk-service-role"
}

data "aws_iam_role" "eb_ec2" {
  name = "aws-elasticbeanstalk-ec2-role"
}

########################
# SECURITY GROUPS
########################
resource "aws_security_group" "alb" {
  name        = "alb-sg"
  description = "Allow HTTP/HTTPS"
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
  description = "Allow Postgres"
  vpc_id      = data.aws_vpcs.default.ids[0]

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# now two separate rule resources:
resource "aws_security_group_rule" "rds_from_eb" {
  description              = "Allow EB instances to talk to RDS"
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.rds.id
  source_security_group_id = aws_security_group.eb.id
}

resource "aws_security_group_rule" "rds_from_dev" {
  description       = "Allow my laptop to talk to RDS"
  type              = "ingress"
  from_port         = 5432
  to_port           = 5432
  protocol          = "tcp"
  security_group_id = aws_security_group.rds.id
  cidr_blocks       = ["203.0.113.42/32"]  # ← replace with your public IPv4!
}

########################
# RDS POSTGRESQL
########################
resource "aws_db_subnet_group" "db_subnets" {
  name       = "rds-subnets"
  subnet_ids = data.aws_subnets.default.ids
}

resource "aws_db_instance" "postgres" {
  identifier              = "energy-db"
  engine                  = "postgres"
  engine_version          = "16.5"
  instance_class          = "db.t4g.micro"
  allocated_storage       = 20
  db_name                 = "energy"
  username                = "postgres"
  password                = var.db_password
  skip_final_snapshot     = true
  publicly_accessible     = true

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.db_subnets.name
}

########################
# ACM & ROUTE53 (optional HTTPS)
########################
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
  name    = tolist(aws_acm_certificate.cert[0].domain_validation_options)[count.index].resource_record_name
  type    = tolist(aws_acm_certificate.cert[0].domain_validation_options)[count.index].resource_record_type
  records = [tolist(aws_acm_certificate.cert[0].domain_validation_options)[count.index].resource_record_value]
  ttl     = 300
}

resource "aws_acm_certificate_validation" "cert_validation" {
  count                   = var.domain_name == "" ? 0 : 1
  certificate_arn         = aws_acm_certificate.cert[0].arn
  validation_record_fqdns = aws_route53_record.cert_validation[*].fqdn
}

########################
# ELASTIC BEANSTALK
########################
resource "aws_elastic_beanstalk_application" "app" {
  name        = "energy-dashboard"
  description = "FastAPI Energy Dashboard"
}

resource "aws_elastic_beanstalk_environment" "env" {
  name                = "energy-dashboard-env"
  application         = aws_elastic_beanstalk_application.app.name
  solution_stack_name = "64bit Amazon Linux 2 v4.1.1 running Docker"

  # VPC & subnets
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

  # custom SGs
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

  # existing EB roles
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

  # container port & type
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

  # HTTPS listener
  dynamic "setting" {
    for_each = var.domain_name == "" ? [] : [
      {
        namespace = "aws:elbv2:listener:443"
        name      = "Protocol"
        value     = "HTTPS"
      },
      {
        namespace = "aws:elbv2:listener:443"
        name      = "SSLCertificateArns"
        value     = aws_acm_certificate.cert[0].arn
      }
    ]
    content {
      namespace = setting.value.namespace
      name      = setting.value.name
      value     = setting.value.value
    }
  }

  wait_for_ready_timeout = "20m"
}

################
# OUTPUTS
################
output "rds_endpoint" {
  value = aws_db_instance.postgres.endpoint
}

output "beanstalk_url" {
  value = aws_elastic_beanstalk_environment.env.endpoint_url
}