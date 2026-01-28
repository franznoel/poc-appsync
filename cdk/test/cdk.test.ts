import * as cdk from 'aws-cdk-lib/core';
import { Template } from 'aws-cdk-lib/assertions';
import { CdkStack } from '../lib/cdk-stack';

describe('AppSync POC Stack', () => {
  test('creates DynamoDB table with GSI', () => {
    const app = new cdk.App();
    const stack = new CdkStack(app, 'TestStack', {
      environment: 'dev',
    });
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::DynamoDB::Table', {
      BillingMode: 'PAY_PER_REQUEST',
      GlobalSecondaryIndexes: [
        {
          IndexName: 'TypeIndex',
        },
      ],
    });
  });

  test('creates Cognito User Pool', () => {
    const app = new cdk.App();
    const stack = new CdkStack(app, 'TestStack', {
      environment: 'dev',
    });
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Cognito::UserPool', {
      AutoVerifiedAttributes: ['email'],
    });
  });

  test('creates AppSync API', () => {
    const app = new cdk.App();
    const stack = new CdkStack(app, 'TestStack', {
      environment: 'dev',
    });
    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::AppSync::GraphQLApi', 1);
  });

  test('creates S3 bucket and CloudFront distribution', () => {
    const app = new cdk.App();
    const stack = new CdkStack(app, 'TestStack', {
      environment: 'dev',
    });
    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::S3::Bucket', 1);
    template.resourceCountIs('AWS::CloudFront::Distribution', 1);
  });
});
