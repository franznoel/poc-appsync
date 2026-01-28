#!/bin/bash

# Setup script for local development
# Usage: ./scripts/setup-local.sh [dev|stage|prod]

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get environment from argument or default to dev
ENVIRONMENT=${1:-dev}

echo -e "${GREEN}Setting up local development for environment: $ENVIRONMENT${NC}"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|stage|prod)$ ]]; then
  echo -e "${RED}Error: Invalid environment. Use dev, stage, or prod${NC}"
  exit 1
fi

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
  echo -e "${RED}Error: AWS CLI is not configured. Please run 'aws configure'${NC}"
  exit 1
fi

# Get stack outputs
echo -e "${YELLOW}Retrieving configuration from AWS...${NC}"
STACK_NAME="AppsyncPocStack-$ENVIRONMENT"

if ! aws cloudformation describe-stacks --stack-name $STACK_NAME &> /dev/null; then
  echo -e "${RED}Error: Stack $STACK_NAME not found. Please deploy the infrastructure first:${NC}"
  echo -e "${YELLOW}  cd cdk && cdk deploy --context environment=$ENVIRONMENT${NC}"
  exit 1
fi

USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" --output text)
USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" --output text)
GRAPHQL_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='GraphQLApiUrl'].OutputValue" --output text)
API_KEY=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='GraphQLApiKey'].OutputValue" --output text)
REGION=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='Region'].OutputValue" --output text)

# Change to frontend directory
cd "$(dirname "$0")/../frontend"

# Create .env.local file
echo -e "${YELLOW}Creating .env.local file...${NC}"
cat > .env.local <<EOF
REACT_APP_AWS_REGION=$REGION
REACT_APP_USER_POOL_ID=$USER_POOL_ID
REACT_APP_USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID
REACT_APP_GRAPHQL_URL=$GRAPHQL_URL
REACT_APP_API_KEY=$API_KEY
EOF

echo -e "${YELLOW}Installing frontend dependencies...${NC}"
npm install

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Local development setup completed!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "Environment:         ${YELLOW}$ENVIRONMENT${NC}"
echo -e "Region:              ${YELLOW}$REGION${NC}"
echo -e "User Pool ID:        ${YELLOW}$USER_POOL_ID${NC}"
echo -e "GraphQL API URL:     ${YELLOW}$GRAPHQL_URL${NC}"
echo ""
echo -e "${GREEN}To start the development server, run:${NC}"
echo -e "${YELLOW}  cd frontend && npm start${NC}"
echo ""
