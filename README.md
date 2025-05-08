Renewable Energy Dashboard Project

Table of Contents

1. Project Overview
2. Prerequisites
3. Environment Variables
4. Local Setup
   • Backend
   • Frontend
5. Running with Docker
6. Infrastructure with Terraform
7. AWS Deployment
   • Elastic Beanstalk
   • S3 Frontend Hosting
   • RDS (PostgreSQL)
8. API Usage

============================================================================================================================

1. Project Overview

The Renewable Energy Dashboard visualizes hourly renewable energy consumption and generation data via secure user authentication, file uploads, and interactive charts.

============================================================================================================================

2. Prerequisites
   • OS: Linux, macOS, or Windows 10+ (with WSL2)
   • Docker: v20.10+
   • Docker Compose: v1.29+
   • Python: 3.10+
   • Node.js: 16.x LTS
   • npm / yarn: npm v8+ or yarn v1+
   • AWS CLI: v2.x
   • Terraform: v1.3+

============================================================================================================================

3. Environment Variables

Create a .env file in the backend directory with these values:

# Database

DB_HOST=energy-db.cbss0ku2mhwz.us-west-2.rds.amazonaws.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASS=Admin2784

# JWT

JWT_SECRET=8d6dafb35e8eca6783a8f347158782ce8d055753f9e67370dbc5affd6bd64cd5
JWT_ALGORITHM=HS256
JWT_EXPIRES_MINUTES=30

# AWS

AWS_ACCESS_KEY_ID=AKIA3GR3ZBEVIBNADRGM
AWS_SECRET_ACCESS_KEY=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
AWS_REGION=us-west-2
S3_BUCKET=energy-dashboard-frontend-5790d44a
BEANSTALK_ENV=energy-dashboard-env
BEANSTALK_URL=awseb-e-j-AWSEBLoa-EW0YD76YF02R-1633716413.us-west-2.elb.amazonaws.com

# GitHub

GITHUB_TOKEN=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

# Frontend URL

FRONTEND_URL=http://energy-dashboard-frontend-5790d44a.s3-website-us-west-2.amazonaws.com

After CloudFeont Setup - d1v02mozm1fy9b.cloudfront.net (This is main URL with domain on it)

============================================================================================================================

4. Local Setup

Backend

git clone https://github.com/darshantogadiya98/RenewableEnergyDataVisualization.git
cd energy-dashboard/backend
python3 -m venv .venv
source .venv/bin/activate # macOS/Linux
.\.venv\Scripts\activate # Windows
pip install --upgrade pip
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --reload-dir app --host 0.0.0.0 --port 8000

Frontend

cd ../frontend
npm install # or yarn install
npm run dev # or yarn dev

# Browse: http://localhost:3000

============================================================================================================================

5. Running with Docker

Use Docker Compose for an all-in-one local environment:

docker-compose up --build

    •	backend: FastAPI @ localhost:8000
    •	db: PostgreSQL @ 5432
    •	frontend: React @ localhost:3000

============================================================================================================================

6. Infrastructure with Terraform

All infra code lives in infra/terraform/. You’ll provision:
• Networking: Default VPC, subnets
• Security Groups: ALB, EB instances, RDS
• Database: RDS PostgreSQL instance
• Storage: S3 bucket + CloudFront for SPA
• Application: Elastic Beanstalk app & environment with Docker
• IAM: Roles for EB service & EC2
• CDN & CORS: CloudFront distributions for frontend & API

Quick Commands

cd infra/terraform
terraform init
terraform plan -out tfplan
terraform apply tfplan

Key Terraform Files
• provider.tf – AWS provider & state backend
• variables.tf – input variables (region, passwords, domain)
• network.tf – VPC & subnet lookups
• security.tf – SG definitions
• rds.tf – aws_db_instance + subnet group
• s3.tf – frontend bucket + website config
• cloudfront.tf – SPA & API distributions + CORS policy
• eb.tf – EB application, environment, code bucket/version
• iam.tf – pre-existing EB roles
• outputs.tf – endpoints (RDS, EB, CloudFront)

Use the generated outputs (rds_endpoint, beanstalk_url, frontend_url) to update your .env or CI/CD workflows.

============================================================================================================================

7. AWS Deployment

Elastic Beanstalk

eb init energy-dashboard --platform python-3.10 --region us-west-2
eb use energy-dashboard-env
eb deploy

S3 Frontend Hosting

cd frontend
npm run build
aws s3 sync dist/ \
 s3://energy-dashboard-frontend-5790d44a \
 --delete

# (Optional) CloudFront invalidation

aws cloudfront create-invalidation --distribution-id <DIST_ID> --paths "/\*"

RDS (PostgreSQL)
• Confirm SG allows EB & local IP
• Connection string: postgresql://postgres:<DB_PASS>@<rds_endpoint>/energy

============================================================================================================================

8. API Usage

Upload CSV example:

curl -v \
 -H "Authorization: Bearer <JWT>" \
 -F file=@/path/to/data.csv \
 http://127.0.0.1:8000/energy/upload
