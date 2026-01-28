# Testing Guide

This guide explains how to test the AppSync POC application locally and after deployment.

## Local Testing (Before Deployment)

### Prerequisites

Ensure you have:
- AWS CLI configured with valid credentials
- CDK infrastructure deployed to at least one environment
- Environment variables configured in `frontend/.env.local`

### 1. Running the Frontend Locally

```bash
# Navigate to frontend directory
cd frontend

# Start the development server
npm start
```

The application will open at `http://localhost:3000`

### 2. Testing Authentication

#### Create a New User
1. Click "Create Account" on the sign-in page
2. Fill in the form:
   - Email: Use a real email address (for verification)
   - Password: Must meet requirements (8+ chars, uppercase, lowercase, number, symbol)
3. Click "Create Account"
4. Check your email for verification code
5. Enter the verification code
6. Sign in with your credentials

#### Sign In
1. Enter your email and password
2. Click "Sign In"
3. You should see the main application interface

#### Sign Out
1. Click the "Sign Out" button in the header
2. You should be redirected to the sign-in page

### 3. Testing CRUD Operations

#### Create Content

**Create a Page:**
1. Ensure "Pages" tab is selected
2. Click "Create New PAGE"
3. Fill in:
   - Title: "My First Page"
   - Content: "This is my first page content"
4. Click "Create"
5. Verify the page appears in the list

**Create a Post:**
1. Click "Posts" tab
2. Click "Create New POST"
3. Fill in title and content
4. Click "Create"
5. Verify the post appears

**Create Media:**
1. Click "Media" tab
2. Click "Create New MEDIA"
3. Fill in title and content (e.g., media URL or description)
4. Click "Create"
5. Verify the media appears

#### Read Content

1. Click on different tabs (Pages, Posts, Media)
2. Verify items are listed correctly
3. Check that all fields are displayed:
   - Title
   - Content
   - Created by (username)
   - Created date

#### Update Content

1. Click "Edit" on any content item
2. Modify the title or content
3. Click "Save"
4. Verify changes are reflected
5. Check that "Updated at" timestamp changed

#### Delete Content

1. Click "Delete" on any content item
2. Confirm deletion in the dialog
3. Verify item is removed from the list

### 4. Testing Error Handling

#### Invalid Form Submission
1. Click "Create New PAGE"
2. Leave title or content empty
3. Click "Create"
4. Verify error message appears

#### Network Errors
1. Disconnect from the internet
2. Try to create or fetch content
3. Verify appropriate error message displays
4. Reconnect and verify functionality restores

### 5. Testing Different Content Types

1. Create at least 3 items of each type (Page, Post, Media)
2. Switch between tabs and verify:
   - Correct items show for each type
   - No cross-contamination between types
   - Items are sorted by creation date

## Testing Deployed Application

### 1. Access the Application

```bash
# Get CloudFront URL from stack outputs
aws cloudformation describe-stacks \
  --stack-name AppsyncPocStack-dev \
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontURL'].OutputValue" \
  --output text

# Open in browser
# Expected: Application loads successfully
```

### 2. Test CloudFront Distribution

#### HTTPS Redirect
```bash
# Should redirect to HTTPS
curl -I http://<cloudfront-domain>
# Expected: 301 or 307 redirect to HTTPS
```

#### SPA Routing
```bash
# Access a non-existent route - should return index.html
curl https://<cloudfront-domain>/some/random/path
# Expected: HTML content (not 404)
```

### 3. Test AppSync API Directly

#### Using API Key

```bash
# Get API Key and URL from stack outputs
API_KEY=$(aws cloudformation describe-stacks \
  --stack-name AppsyncPocStack-dev \
  --query "Stacks[0].Outputs[?OutputKey=='GraphQLApiKey'].OutputValue" \
  --output text)

GRAPHQL_URL=$(aws cloudformation describe-stacks \
  --stack-name AppsyncPocStack-dev \
  --query "Stacks[0].Outputs[?OutputKey=='GraphQLApiUrl'].OutputValue" \
  --output text)

# Test schema introspection
curl -X POST \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}' \
  $GRAPHQL_URL
# Expected: JSON with schema types
```

#### Test Query (requires authentication token)

```bash
# Get auth token after signing in
# This is complex - easier to test via the UI

# List content by type
curl -X POST \
  -H "Authorization: Bearer <id-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { listContentByType(type: PAGE, limit: 10) { items { id title } } }"
  }' \
  $GRAPHQL_URL
```

### 4. Test Cognito User Pool

#### Check User Pool Configuration

```bash
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name AppsyncPocStack-dev \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" \
  --output text)

# Describe user pool
aws cognito-idp describe-user-pool \
  --user-pool-id $USER_POOL_ID

# List users
aws cognito-idp list-users \
  --user-pool-id $USER_POOL_ID
```

### 5. Test DynamoDB Table

#### Check Table Contents

```bash
# Get table name
TABLE_NAME=$(aws dynamodb list-tables \
  --query "TableNames[?contains(@, 'content-table-dev')]" \
  --output text)

# Scan table (shows all items)
aws dynamodb scan \
  --table-name $TABLE_NAME \
  --limit 10

# Query by type using GSI
aws dynamodb query \
  --table-name $TABLE_NAME \
  --index-name TypeIndex \
  --key-condition-expression "#type = :type" \
  --expression-attribute-names '{"#type": "type"}' \
  --expression-attribute-values '{":type": {"S": "PAGE"}}'
```

### 6. Performance Testing

#### Load Testing with Apache Bench

```bash
# Test CloudFront endpoint
ab -n 100 -c 10 https://<cloudfront-domain>/

# Test API endpoint
ab -n 100 -c 10 \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -p query.json \
  $GRAPHQL_URL

# query.json contains:
# {"query": "{ __typename }"}
```

#### Monitor CloudWatch Metrics

```bash
# AppSync metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/AppSync \
  --metric-name 4XXError \
  --dimensions Name=GraphQLAPIId,Value=<api-id> \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

### 7. Security Testing

#### Test CORS
```bash
# Should allow configured origins only
curl -H "Origin: http://example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: X-Requested-With" \
  -X OPTIONS \
  $GRAPHQL_URL
```

#### Test Authentication
```bash
# Try accessing API without auth - should fail with Cognito auth
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}' \
  $GRAPHQL_URL
# Expected: Unauthorized error
```

#### Test S3 Direct Access
```bash
# Should be blocked (OAC in use)
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name AppsyncPocStack-dev \
  --query "Stacks[0].Outputs[?OutputKey=='WebsiteBucketName'].OutputValue" \
  --output text)

curl -I https://$BUCKET_NAME.s3.amazonaws.com/index.html
# Expected: 403 Forbidden
```

## Browser Testing

### Supported Browsers
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

### Test Scenarios

1. **Desktop Testing:**
   - Test at 1920x1080 resolution
   - Test at 1366x768 resolution
   - Verify responsive design

2. **Mobile Testing:**
   - Test on iOS Safari
   - Test on Chrome for Android
   - Verify touch interactions
   - Test at various screen sizes

3. **Browser DevTools:**
   - Check console for errors
   - Verify network requests
   - Test localStorage/sessionStorage
   - Check for memory leaks

## Automated Testing

### Unit Tests

```bash
# CDK tests
cd cdk
npm test

# Frontend tests
cd frontend
npm test
```

### E2E Tests (Example with Playwright)

If you add E2E tests:

```bash
# Install Playwright
npm install -D @playwright/test

# Run tests
npx playwright test

# Run in UI mode
npx playwright test --ui
```

## Monitoring and Debugging

### CloudWatch Logs

```bash
# AppSync logs
aws logs tail /aws/appsync/apis/<api-id> --follow

# Lambda logs (if you add Lambda resolvers)
aws logs tail /aws/lambda/<function-name> --follow
```

### X-Ray Tracing

```bash
# View traces in AWS Console
# AppSync → Your API → Monitoring → X-Ray traces
```

### Application Insights

Monitor:
- API response times
- Error rates
- User authentication success/failure
- DynamoDB read/write capacity
- CloudFront cache hit ratio

## Test Checklist

### Before Release

- [ ] All unit tests pass
- [ ] Frontend builds successfully
- [ ] CDK synth produces valid CloudFormation
- [ ] Manual testing completed
- [ ] Cross-browser testing completed
- [ ] Mobile responsive testing completed
- [ ] Security testing completed
- [ ] Performance testing completed
- [ ] Documentation is up to date

### After Deployment

- [ ] Application accessible via CloudFront URL
- [ ] HTTPS working correctly
- [ ] SPA routing working (refresh on any route)
- [ ] User registration working
- [ ] Email verification working
- [ ] Sign in/out working
- [ ] CRUD operations working for all content types
- [ ] API authentication working
- [ ] No errors in browser console
- [ ] No errors in CloudWatch logs

## Troubleshooting Tests

### Common Issues

**Frontend doesn't connect to API:**
- Verify .env.local is configured correctly
- Check browser console for CORS errors
- Verify AppSync URL is correct

**Authentication fails:**
- Check Cognito User Pool settings
- Verify email is confirmed
- Check auth token expiration

**CRUD operations fail:**
- Check AppSync CloudWatch logs
- Verify IAM permissions
- Test API directly with curl

**Build fails:**
- Clear node_modules and reinstall
- Check for TypeScript errors
- Verify all dependencies are installed

## Resources

- [AWS AppSync Developer Guide](https://docs.aws.amazon.com/appsync/)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [React Testing Library](https://testing-library.com/react)
- [Cognito Developer Guide](https://docs.aws.amazon.com/cognito/)
