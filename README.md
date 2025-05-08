Renewable Energy Dashboard

Project Overview

The Renewable Energy Dashboard is a full-stack web application for managing and visualizing renewable energy data. It allows users to:
• Authenticate via JWT-based signup and login
• Upload CSV datasets of energy production and consumption
• Visualize hourly renewable energy data in interactive charts

The backend is built with FastAPI (Python) and PostgreSQL, while the frontend is implemented in React (TypeScript). The application can run locally via Docker Compose or be deployed on AWS using Terraform, Elastic Beanstalk, S3, and CloudFront.

Table of Contents

1. Prerequisites
2. Environment Setup
3. Local Setup
   • Backend
   • Frontend
4. Docker Setup
5. AWS Infrastructure with Terraform
6. AWS Deployment Instructions
   • Backend to Elastic Beanstalk
   • Frontend to S3 & CloudFront
   • Cache Invalidation
7. API Usage
8. Architecture Diagram

⸻

Prerequisites
• Python 3.10+
• Node.js 16+
• Docker & Docker Compose
• Terraform
• AWS CLI (configured via aws configure)
• AWS Account with permissions for S3, RDS, EB, CloudFront

⸻

Environment Setup

Backend (.env)

Create a .env file in backend/:

DATABASE_URL=postgresql+asyncpg://<DB_USER>:<DB_PASS>@<DB_HOST>:5432/<DB_NAME>
SECRET_KEY=<random-32-byte-hex>
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
AWS_REGION=us-west-2
S3_BUCKET=<frontend-s3-bucket>

Frontend (.env.development & .env.production)

# .env.development

VITE_API_BASE_URL="http://localhost:8000"

# .env.production

VITE_API_BASE_URL="https://<your-cloudfront-domain>"

⸻

Local Setup

Backend

cd backend
python3 -m venv venv
source venv/bin/activate # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

Visit http://localhost:8000/docs for the interactive API.

Frontend

cd frontend
npm install
npm run dev

Open http://localhost:5173 to view the React app.

⸻

Docker Setup

Run the full stack locally with Docker Compose:

docker-compose up --build

    •	Backend: FastAPI @ localhost:8000
    •	Database: PostgreSQL @ localhost:5432
    •	Frontend: React @ localhost:3000 or 5173

Stop with Ctrl+C and docker-compose down.

⸻

AWS Infrastructure with Terraform

Terraform provisions:
• RDS PostgreSQL
• Elastic Beanstalk (FastAPI backend)
• S3 bucket (React static site)
• CloudFront distribution (two origins: S3 & EB)
• IAM roles/policies for secure access

Commands:

cd infra/terraform
tf init
tf plan -out=tfplan
tf apply tfplan

Outputs include RDS endpoint, S3 bucket name, CloudFront domain, and EB URL.

⸻

AWS Deployment Instructions

Backend to Elastic Beanstalk 1. Package your backend (include app/, requirements.txt, Dockerfile, etc.). 2. Upload zip to S3 or use eb deploy (requires awsebcli). 3. Using EB CLI:

cd backend

eb init –platform python-
