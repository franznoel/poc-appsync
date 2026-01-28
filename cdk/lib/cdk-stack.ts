import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as appsync from '@aws-cdk/aws-appsync-alpha';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import * as path from 'path';

export interface AppsyncPocStackProps extends cdk.StackProps {
  environment: string;
}

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AppsyncPocStackProps) {
    super(scope, id, props);

    const { environment } = props;

    // DynamoDB Table for Page/Post/Media
    const table = new dynamodb.Table(this, 'ContentTable', {
      tableName: `content-table-${environment}`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: environment === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      pointInTimeRecovery: environment === 'prod',
    });

    // Add GSI for querying by type
    table.addGlobalSecondaryIndex({
      indexName: 'TypeIndex',
      partitionKey: { name: 'type', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    // Cognito User Pool
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `appsync-poc-users-${environment}`,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: environment === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool,
      userPoolClientName: `appsync-poc-client-${environment}`,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      generateSecret: false,
    });

    // AppSync API
    const api = new appsync.GraphqlApi(this, 'Api', {
      name: `appsync-poc-api-${environment}`,
      schema: appsync.SchemaFile.fromAsset(path.join(__dirname, '../graphql/schema.graphql')),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool,
          },
        },
        additionalAuthorizationModes: [
          {
            authorizationType: appsync.AuthorizationType.API_KEY,
            apiKeyConfig: {
              expires: cdk.Expiration.after(
                environment === 'prod' ? cdk.Duration.days(90) : cdk.Duration.days(365)
              ),
            },
          },
        ],
      },
      xrayEnabled: true,
    });

    // DynamoDB Data Source
    const dataSource = api.addDynamoDbDataSource('ContentDataSource', table);

    // Resolvers for queries
    dataSource.createResolver('GetContentResolver', {
      typeName: 'Query',
      fieldName: 'getContent',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2017-02-28",
          "operation": "GetItem",
          "key": {
            "PK": $util.dynamodb.toDynamoDBJson($ctx.args.id),
            "SK": $util.dynamodb.toDynamoDBJson($ctx.args.id)
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    });

    dataSource.createResolver('ListContentByTypeResolver', {
      typeName: 'Query',
      fieldName: 'listContentByType',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2017-02-28",
          "operation": "Query",
          "index": "TypeIndex",
          "query": {
            "expression": "#type = :type",
            "expressionNames": {
              "#type": "type"
            },
            "expressionValues": {
              ":type": $util.dynamodb.toDynamoDBJson($ctx.args.type)
            }
          },
          "limit": $util.defaultIfNull($ctx.args.limit, 20),
          "nextToken": $util.toJson($util.defaultIfNullOrBlank($ctx.args.nextToken, null))
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultList(),
    });

    // Resolvers for mutations
    dataSource.createResolver('CreateContentResolver', {
      typeName: 'Mutation',
      fieldName: 'createContent',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2017-02-28",
          "operation": "PutItem",
          "key": {
            "PK": $util.dynamodb.toDynamoDBJson($ctx.args.input.id),
            "SK": $util.dynamodb.toDynamoDBJson($ctx.args.input.id)
          },
          "attributeValues": {
            "id": $util.dynamodb.toDynamoDBJson($ctx.args.input.id),
            "type": $util.dynamodb.toDynamoDBJson($ctx.args.input.type),
            "title": $util.dynamodb.toDynamoDBJson($ctx.args.input.title),
            "content": $util.dynamodb.toDynamoDBJson($ctx.args.input.content),
            "createdAt": $util.dynamodb.toDynamoDBJson($util.time.nowISO8601()),
            "updatedAt": $util.dynamodb.toDynamoDBJson($util.time.nowISO8601()),
            "createdBy": $util.dynamodb.toDynamoDBJson($ctx.identity.username)
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    });

    dataSource.createResolver('UpdateContentResolver', {
      typeName: 'Mutation',
      fieldName: 'updateContent',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2017-02-28",
          "operation": "UpdateItem",
          "key": {
            "PK": $util.dynamodb.toDynamoDBJson($ctx.args.input.id),
            "SK": $util.dynamodb.toDynamoDBJson($ctx.args.input.id)
          },
          "update": {
            "expression": "SET title = :title, content = :content, updatedAt = :updatedAt",
            "expressionValues": {
              ":title": $util.dynamodb.toDynamoDBJson($ctx.args.input.title),
              ":content": $util.dynamodb.toDynamoDBJson($ctx.args.input.content),
              ":updatedAt": $util.dynamodb.toDynamoDBJson($util.time.nowISO8601())
            }
          },
          "condition": {
            "expression": "createdBy = :username",
            "expressionValues": {
              ":username": $util.dynamodb.toDynamoDBJson($ctx.identity.username)
            }
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    });

    dataSource.createResolver('DeleteContentResolver', {
      typeName: 'Mutation',
      fieldName: 'deleteContent',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2017-02-28",
          "operation": "DeleteItem",
          "key": {
            "PK": $util.dynamodb.toDynamoDBJson($ctx.args.id),
            "SK": $util.dynamodb.toDynamoDBJson($ctx.args.id)
          },
          "condition": {
            "expression": "createdBy = :username",
            "expressionValues": {
              ":username": $util.dynamodb.toDynamoDBJson($ctx.identity.username)
            }
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    });

    // S3 Bucket for React App
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `appsync-poc-frontend-${environment}-${this.account}`,
      removalPolicy: environment === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      autoDeleteObjects: environment !== 'prod',
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // Origin Access Control (OAC) for CloudFront
    const cfnOriginAccessControl = new cloudfront.CfnOriginAccessControl(this, 'OAC', {
      originAccessControlConfig: {
        name: `appsync-poc-oac-${environment}`,
        originAccessControlOriginType: 's3',
        signingBehavior: 'always',
        signingProtocol: 'sigv4',
      },
    });

    // CloudFront Distribution
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
    });

    // Update CloudFront distribution to use OAC
    const cfnDistribution = distribution.node.defaultChild as cloudfront.CfnDistribution;
    cfnDistribution.addPropertyOverride('DistributionConfig.Origins.0.OriginAccessControlId', cfnOriginAccessControl.attrId);
    cfnDistribution.addPropertyOverride('DistributionConfig.Origins.0.DomainName', websiteBucket.bucketRegionalDomainName);
    cfnDistribution.addPropertyOverride('DistributionConfig.Origins.0.S3OriginConfig.OriginAccessIdentity', '');

    // Bucket Policy for OAC
    websiteBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [websiteBucket.arnForObjects('*')],
        principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
        conditions: {
          StringEquals: {
            'AWS:SourceArn': `arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`,
          },
        },
      })
    );

    // Outputs
    new CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: `UserPoolId-${environment}`,
    });

    new CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: `UserPoolClientId-${environment}`,
    });

    new CfnOutput(this, 'GraphQLApiUrl', {
      value: api.graphqlUrl,
      description: 'AppSync GraphQL API URL',
      exportName: `GraphQLApiUrl-${environment}`,
    });

    new CfnOutput(this, 'GraphQLApiKey', {
      value: api.apiKey || '',
      description: 'AppSync API Key',
      exportName: `GraphQLApiKey-${environment}`,
    });

    new CfnOutput(this, 'Region', {
      value: this.region,
      description: 'AWS Region',
      exportName: `Region-${environment}`,
    });

    new CfnOutput(this, 'WebsiteBucketName', {
      value: websiteBucket.bucketName,
      description: 'S3 Bucket for Website',
      exportName: `WebsiteBucketName-${environment}`,
    });

    new CfnOutput(this, 'CloudFrontURL', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront Distribution URL',
      exportName: `CloudFrontURL-${environment}`,
    });

    new CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront Distribution ID',
      exportName: `DistributionId-${environment}`,
    });
  }
}
