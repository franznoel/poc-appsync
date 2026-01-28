# AppSync POC Application

A full-stack serverless application built with AWS CDK, AppSync, Cognito, DynamoDB, and React.

## Architecture

This application consists of:

### Backend (AWS CDK Infrastructure)
- **DynamoDB**: Single table design for Pages, Posts, and Media content
- **Cognito User Pool**: User authentication and authorization
- **AppSync API**: GraphQL API with real-time capabilities
- **S3 + CloudFront**: Static website hosting with Origin Access Control (OAC)
- **Multi-environment support**: dev, stage, and prod environments

### Frontend (React + TypeScript)
- **React 18** with TypeScript
- **AWS Amplify**: Authentication integration
- **Apollo Client**: GraphQL client for AppSync
- **Responsive UI**: Material-inspired design

## Features

- ✅ User authentication with Cognito
- ✅ CRUD operations for Pages, Posts, and Media
- ✅ Real-time GraphQL API with AppSync
- ✅ Single DynamoDB table with GSI for efficient queries
- ✅ Secure S3 hosting with CloudFront and OAC
- ✅ Multi-environment deployment (dev/stage/prod)
- ✅ CI/CD with GitHub Actions

## Prerequisites

- Node.js 18+ and npm
- AWS CLI configured with credentials
- AWS CDK CLI: `npm install -g aws-cdk`

## Project Structure

```
.
├── cdk/                    # AWS CDK infrastructure
│   ├── bin/               # CDK app entry point
│   ├── lib/               # CDK stack definitions
│   ├── graphql/           # GraphQL schema
│   └── package.json
├── frontend/              # React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── aws-exports.ts # AWS configuration
│   │   └── App.tsx        # Main app component
│   └── package.json
└── .github/workflows/     # CI/CD pipelines
```

## Local Development

### 1. Install Dependencies

```bash
# Install CDK dependencies
cd cdk
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Deploy Infrastructure

First, deploy the CDK stack to AWS:

```bash
cd cdk

# Bootstrap CDK (first time only)
cdk bootstrap

# Deploy to dev environment
cdk deploy --context environment=dev

# Deploy to other environments
cdk deploy --context environment=stage
cdk deploy --context environment=prod
```

After deployment, note the stack outputs:
- UserPoolId
- UserPoolClientId
- GraphQLApiUrl
- GraphQLApiKey
- Region

### 3. Configure Frontend

Create a `.env.local` file in the `frontend` directory:

```bash
cd frontend
cp .env.example .env.local
```

Update `.env.local` with your stack outputs:

```env
REACT_APP_AWS_REGION=us-east-1
REACT_APP_USER_POOL_ID=your-user-pool-id
REACT_APP_USER_POOL_CLIENT_ID=your-user-pool-client-id
REACT_APP_GRAPHQL_URL=your-appsync-graphql-url
REACT_APP_API_KEY=your-api-key
```

### 4. Run the Application Locally

```bash
cd frontend
npm start
```

The application will open at http://localhost:3000

### 5. Test the Application

1. Create a new account using the sign-up form
2. Verify your email address
3. Sign in with your credentials
4. Create, read, update, and delete Pages, Posts, or Media items

## Deployment

### Manual Deployment

```bash
# Deploy infrastructure
cd cdk
cdk deploy --context environment=prod

# Build and deploy frontend
cd ../frontend
npm run build

# Upload to S3 (replace with your bucket name)
aws s3 sync build/ s3://your-bucket-name --delete

# Invalidate CloudFront cache (replace with your distribution ID)
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

### Automated Deployment (CI/CD)

The project includes GitHub Actions workflows for automated deployment:

1. **Setup Secrets** in GitHub repository:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION` (optional, defaults to us-east-1)

2. **Deployment Triggers**:
   - Push to `main` branch → deploys to **prod**
   - Push to `develop` branch → deploys to **stage**
   - Manual workflow dispatch → deploy to any environment

## GraphQL Schema

The API supports the following operations:

### Queries
```graphql
# Get a single content item
getContent(id: ID!): Content

# List content by type
listContentByType(type: ContentType!, limit: Int, nextToken: String): ContentConnection
```

### Mutations
```graphql
# Create new content
createContent(input: CreateContentInput!): Content

# Update existing content
updateContent(input: UpdateContentInput!): Content

# Delete content
deleteContent(id: ID!): Content
```

### Types
```graphql
type Content {
  id: ID!
  type: ContentType!
  title: String!
  content: String!
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime!
  createdBy: String!
}

enum ContentType {
  PAGE
  POST
  MEDIA
}
```

## DynamoDB Table Design

Single table design with the following structure:

| PK | SK | type | title | content | createdAt | updatedAt | createdBy |
|----|-------|------|-------|---------|-----------|-----------|-----------|
| {id} | {id} | PAGE/POST/MEDIA | ... | ... | ... | ... | ... |

**Global Secondary Index (TypeIndex)**:
- Partition Key: `type`
- Sort Key: `createdAt`

## Security

- **Authentication**: Cognito User Pool with email verification
- **Authorization**: AppSync with Cognito User Pool authentication
- **API Access**: Primary auth via Cognito, secondary via API Key
- **S3 Access**: Origin Access Control (OAC) for CloudFront-only access
- **HTTPS Only**: CloudFront enforces HTTPS

## Cost Optimization

- **DynamoDB**: On-demand pricing (pay per request)
- **AppSync**: Pay per request and data transfer
- **Cognito**: Free tier: 50,000 MAUs
- **S3**: Minimal storage costs
- **CloudFront**: Free tier: 1TB data transfer out

## Troubleshooting

### CDK Deployment Issues

```bash
# Check CDK version
cdk --version

# Synthesize template without deploying
cdk synth --context environment=dev

# View differences before deploying
cdk diff --context environment=dev
```

### Frontend Issues

```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run build
```

### Authentication Issues

- Verify Cognito User Pool settings in AWS Console
- Check that email verification is enabled
- Ensure User Pool Client has correct auth flows enabled

## Clean Up

To avoid ongoing charges, delete all resources:

```bash
cd cdk

# Delete dev stack
cdk destroy --context environment=dev

# Delete other environments
cdk destroy --context environment=stage
cdk destroy --context environment=prod
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Test locally
4. Submit a pull request

## License

MIT License

## Support

For issues and questions, please open a GitHub issue.

