# Deployment Guide

This guide explains how to deploy the AppSync POC application to AWS.

## Prerequisites

- AWS Account
- AWS CLI configured with credentials
- Node.js 18+ and npm
- AWS CDK CLI installed: `npm install -g aws-cdk`

## Quick Start Deployment

### Option 1: Using the Deployment Script (Recommended)

```bash
# Deploy to dev environment
./scripts/deploy.sh dev

# Deploy to stage environment
./scripts/deploy.sh stage

# Deploy to production environment
./scripts/deploy.sh prod
```

The script will:
1. Install CDK dependencies
2. Build and deploy the CDK stack
3. Retrieve stack outputs
4. Install frontend dependencies
5. Build the React application
6. Deploy to S3
7. Invalidate CloudFront cache
8. Display deployment information

### Option 2: Manual Step-by-Step Deployment

#### 1. Deploy CDK Infrastructure

```bash
cd cdk

# Install dependencies
npm install

# Build the CDK project
npm run build

# Bootstrap CDK (first time only, per AWS account/region)
cdk bootstrap

# Deploy to dev environment
cdk deploy --context environment=dev --require-approval never

# Or deploy to other environments
cdk deploy --context environment=stage --require-approval never
cdk deploy --context environment=prod --require-approval never
```

#### 2. Note Stack Outputs

After deployment, note the following outputs:
- `UserPoolId`
- `UserPoolClientId`
- `GraphQLApiUrl`
- `GraphQLApiKey`
- `Region`
- `WebsiteBucketName`
- `DistributionId`
- `CloudFrontURL`

#### 3. Configure Frontend

```bash
cd ../frontend

# Create .env.local file
cat > .env.local <<EOF
REACT_APP_AWS_REGION=<Region>
REACT_APP_USER_POOL_ID=<UserPoolId>
REACT_APP_USER_POOL_CLIENT_ID=<UserPoolClientId>
REACT_APP_GRAPHQL_URL=<GraphQLApiUrl>
REACT_APP_API_KEY=<GraphQLApiKey>
EOF
```

#### 4. Build and Deploy Frontend

```bash
# Install dependencies
npm install

# Build the React app
npm run build

# Deploy to S3
aws s3 sync build/ s3://<WebsiteBucketName> --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id <DistributionId> \
  --paths "/*"
```

## Environment Configuration

The application supports three environments:

### Development (dev)
- Lower cost resources
- Auto-delete S3 objects on stack deletion
- No DynamoDB point-in-time recovery
- Suitable for development and testing

### Staging (stage)
- Similar to production configuration
- Used for pre-production testing
- Auto-delete S3 objects on stack deletion

### Production (prod)
- DynamoDB point-in-time recovery enabled
- S3 bucket retained on stack deletion
- DynamoDB table retained on stack deletion
- Enhanced security and durability

## CI/CD Deployment

### GitHub Actions Setup

1. **Add GitHub Secrets**:
   - Go to your repository Settings → Secrets and variables → Actions
   - Add the following secrets:
     - `AWS_ACCESS_KEY_ID`: Your AWS access key
     - `AWS_SECRET_ACCESS_KEY`: Your AWS secret key
     - `AWS_REGION`: (Optional) Default is us-east-1

2. **Automatic Deployment**:
   - Push to `main` branch → deploys to **prod**
   - Push to `develop` branch → deploys to **stage**
   - Other branches → deploys to **dev** (if workflow is triggered)

3. **Manual Deployment**:
   - Go to Actions tab
   - Select "Deploy to AWS" workflow
   - Click "Run workflow"
   - Select the environment (dev/stage/prod)

## Verification

After deployment, verify the application:

1. **Access the Application**:
   ```bash
   # Open the CloudFront URL from stack outputs
   open <CloudFrontURL>
   ```

2. **Create a User**:
   - Click "Create Account"
   - Enter email and password
   - Verify your email
   - Sign in

3. **Test CRUD Operations**:
   - Create a new Page, Post, or Media item
   - Edit an existing item
   - Delete an item
   - Switch between content types

4. **Check AppSync API**:
   ```bash
   # Test GraphQL API
   curl -X POST \
     -H "x-api-key: <GraphQLApiKey>" \
     -H "Content-Type: application/json" \
     -d '{"query": "query { __schema { types { name } } }"}' \
     <GraphQLApiUrl>
   ```

## Updating the Application

To update an existing deployment:

```bash
# Update infrastructure
cd cdk
npm run build
cdk deploy --context environment=<env>

# Update frontend
cd ../frontend
npm run build
aws s3 sync build/ s3://<WebsiteBucketName> --delete
aws cloudfront create-invalidation --distribution-id <DistributionId> --paths "/*"
```

Or use the deployment script:

```bash
./scripts/deploy.sh <env>
```

## Rollback

To rollback to a previous version:

### CDK Stack Rollback

```bash
cd cdk

# View previous stack events
aws cloudformation describe-stack-events \
  --stack-name AppsyncPocStack-<env> \
  --max-items 50

# Rollback is automatic if deployment fails
# For manual rollback, deploy the previous version
```

### Frontend Rollback

```bash
# Use S3 versioning or deploy a previous build
aws s3 sync <previous-build-directory> s3://<WebsiteBucketName> --delete
aws cloudfront create-invalidation --distribution-id <DistributionId> --paths "/*"
```

## Troubleshooting

### CDK Deployment Fails

```bash
# Check CloudFormation events
aws cloudformation describe-stack-events \
  --stack-name AppsyncPocStack-<env>

# Delete and redeploy if needed
cdk destroy --context environment=<env>
cdk deploy --context environment=<env>
```

### Frontend Not Loading

1. **Check CloudFront distribution**:
   ```bash
   aws cloudfront get-distribution --id <DistributionId>
   ```

2. **Check S3 bucket policy**:
   ```bash
   aws s3api get-bucket-policy --bucket <WebsiteBucketName>
   ```

3. **Check CloudFront error responses**: Ensure 403/404 redirect to index.html

### Authentication Issues

1. **Verify Cognito User Pool**:
   ```bash
   aws cognito-idp describe-user-pool --user-pool-id <UserPoolId>
   ```

2. **Check User Pool Client settings**:
   ```bash
   aws cognito-idp describe-user-pool-client \
     --user-pool-id <UserPoolId> \
     --client-id <UserPoolClientId>
   ```

### GraphQL API Issues

1. **Test API Key authentication**:
   ```bash
   curl -X POST \
     -H "x-api-key: <GraphQLApiKey>" \
     -H "Content-Type: application/json" \
     -d '{"query": "query { __typename }"}' \
     <GraphQLApiUrl>
   ```

2. **Check AppSync logs in CloudWatch**:
   ```bash
   aws logs tail /aws/appsync/apis/<api-id> --follow
   ```

## Clean Up

To delete all resources and avoid ongoing charges:

```bash
# Using CDK
cd cdk
cdk destroy --context environment=dev
cdk destroy --context environment=stage
cdk destroy --context environment=prod

# Manual cleanup if needed
aws cloudformation delete-stack --stack-name AppsyncPocStack-<env>

# If S3 bucket is retained (prod environment), delete manually
aws s3 rm s3://<WebsiteBucketName> --recursive
aws s3 rb s3://<WebsiteBucketName>
```

## Cost Estimates

### Development Environment
- DynamoDB: ~$0.25/month (on-demand)
- AppSync: ~$4/million requests + $0.08/million minutes
- Cognito: Free tier (up to 50,000 MAUs)
- S3: ~$0.023/GB/month
- CloudFront: $0.085/GB data transfer
- **Estimated Total**: ~$5-10/month for light usage

### Production Environment
- Add ~$0.20/hour for DynamoDB point-in-time recovery
- CloudWatch logs: ~$0.50/GB ingested
- **Estimated Total**: ~$10-20/month for light usage

## Security Best Practices

1. **Use IAM Roles** instead of access keys for deployments
2. **Enable MFA** on AWS account
3. **Rotate API Keys** regularly
4. **Use AWS Secrets Manager** for sensitive configuration
5. **Enable AWS CloudTrail** for audit logging
6. **Set up AWS GuardDuty** for threat detection
7. **Use AWS WAF** with CloudFront for additional security
8. **Enable S3 versioning** for critical buckets

## Support

For issues and questions:
- Check the main [README.md](README.md)
- Review AWS CloudFormation events
- Check CloudWatch logs
- Open a GitHub issue
