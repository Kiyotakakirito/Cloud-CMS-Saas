#!/bin/bash

# Secret Generation Script for CMS SaaS
# Usage: ./scripts/generate_secrets.sh

echo "Generating secure secrets for CMS SaaS..."

# Generate JWT secret key
JWT_SECRET=$(openssl rand -hex 32)
echo "JWT_SECRET=$JWT_SECRET"

# Generate database password
DB_PASSWORD=$(openssl rand -hex 16)
echo "DB_PASSWORD=$DB_PASSWORD"

# Generate random salts
SALT_1=$(openssl rand -hex 16)
SALT_2=$(openssl rand -hex 16)

echo ""
echo "Add these to your production environment:"
echo "========================================"
echo "SECRET_KEY=$JWT_SECRET"
echo "DB_PASSWORD=$DB_PASSWORD"
echo ""
echo "For docker-compose.prod.yml, update:"
echo "  environment:"
echo "    POSTGRES_PASSWORD: $DB_PASSWORD"
echo ""
echo "For .env.production, update:"
echo "  SECRET_KEY: $JWT_SECRET"
echo "  DATABASE_URL: postgresql://postgres:$DB_PASSWORD@db:5432/cms_db"