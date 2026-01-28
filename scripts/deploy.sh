#!/bin/bash

# Deploy script for AppSync POC application
# Usage: ./scripts/deploy.sh [dev|stage|prod]

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get environment from argument or default to dev
ENVIRONMENT=${1:-dev}

echo -e "${GREEN}Starting deployment for environment: $ENVIRONMENT${NC}"

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

# Change to CDK directory
cd "$(dirname "$0")/../cdk"

echo -e "${YELLOW}Installing CDK dependencies...${NC}"
npm install

echo -e "${YELLOW}Building CDK project...${NC}"
npm run build

echo -e "${YELLOW}Deploying CDK stack...${NC}"
npx cdk deploy --require-approval never --context environment=$ENVIRONMENT

# Get stack outputs
echo -e "${YELLOW}Retrieving stack outputs...${NC}"
STACK_NAME="AppsyncPocStack-$ENVIRONMENT"
USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" --output text)
USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" --output text)
GRAPHQL_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='GraphQLApiUrl'].OutputValue" --output text)
API_KEY=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='GraphQLApiKey'].OutputValue" --output text)
REGION=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='Region'].OutputValue" --output text)
BUCKET_NAME=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='WebsiteBucketName'].OutputValue" --output text)
DISTRIBUTION_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" --output text)
CLOUDFRONT_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='CloudFrontURL'].OutputValue" --output text)

# Change to frontend directory
cd ../frontend

echo -e "${YELLOW}Installing frontend dependencies...${NC}"
npm install

# Create .env.local file
echo -e "${YELLOW}Creating .env.local file...${NC}"
cat > .env.local <<EOF
REACT_APP_AWS_REGION=$REGION
REACT_APP_USER_POOL_ID=$USER_POOL_ID
REACT_APP_USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID
REACT_APP_GRAPHQL_URL=$GRAPHQL_URL
REACT_APP_API_KEY=$API_KEY
EOF

echo -e "${YELLOW}Building React application...${NC}"
npm run build

echo -e "${YELLOW}Deploying to S3...${NC}"
aws s3 sync build/ s3://$BUCKET_NAME --delete

echo -e "${YELLOW}Invalidating CloudFront cache...${NC}"
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*" --output text

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Deployment completed successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "Environment:         ${YELLOW}$ENVIRONMENT${NC}"
echo -e "Region:              ${YELLOW}$REGION${NC}"
echo -e "User Pool ID:        ${YELLOW}$USER_POOL_ID${NC}"
echo -e "User Pool Client:    ${YELLOW}$USER_POOL_CLIENT_ID${NC}"
echo -e "GraphQL API URL:     ${YELLOW}$GRAPHQL_URL${NC}"
echo -e "CloudFront URL:      ${YELLOW}$CLOUDFRONT_URL${NC}"
echo ""
echo -e "${GREEN}Your application is now available at:${NC}"
echo -e "${YELLOW}$CLOUDFRONT_URL${NC}"
echo ""
