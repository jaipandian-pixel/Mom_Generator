// config/aws.js
// Creates and exports shared AWS SDK v3 clients used across the app.
// If running on an EC2 instance / Lambda with an IAM Role attached, the SDK
// automatically picks up credentials from the role — you don't need to set
// AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY in that case.

require('dotenv').config();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const { S3Client } = require('@aws-sdk/client-s3');

const region = process.env.AWS_REGION || 'ap-south-1';

const clientConfig = { region };

// Only pass explicit credentials if they are set in .env (local development).
// On EC2/Lambda, leave them blank and the IAM Role will be used automatically.
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  clientConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}

const ddbClient = new DynamoDBClient(clientConfig);
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);
const s3Client = new S3Client(clientConfig);

module.exports = { ddbDocClient, s3Client };
