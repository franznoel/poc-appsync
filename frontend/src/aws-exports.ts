// This file will be generated after CDK deployment
// Copy the outputs from CDK deployment here

const awsconfig = {
  aws_project_region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
  aws_cognito_region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
  aws_user_pools_id: process.env.REACT_APP_USER_POOL_ID || '',
  aws_user_pools_web_client_id: process.env.REACT_APP_USER_POOL_CLIENT_ID || '',
  aws_appsync_graphqlEndpoint: process.env.REACT_APP_GRAPHQL_URL || '',
  aws_appsync_region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
  aws_appsync_authenticationType: 'AMAZON_COGNITO_USER_POOLS',
  aws_appsync_apiKey: process.env.REACT_APP_API_KEY || '',
};

export default awsconfig;
