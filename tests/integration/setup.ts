import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

// Global setup for integration tests
process.env.NODE_ENV = 'test';
process.env.IS_OFFLINE = 'true';
process.env.AWS_REGION = 'us-east-1';
process.env.DYNAMODB_ENDPOINT = 'http://localhost:4566';
process.env.S3_ENDPOINT = 'http://localhost:4566';

// Wait for LocalStack to be ready
const waitForLocalStack = async () => {
  const maxRetries = 5; // Reduced from 30 to 5
  let retries = 0;
  
  const client = new DynamoDBClient({
    region: 'us-east-1',
    endpoint: 'http://localhost:4566',
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
  });
  
  const docClient = DynamoDBDocumentClient.from(client);
  
  while (retries < maxRetries) {
    try {
      await docClient.send(new PutCommand({
        TableName: 'users_certificate',
        Item: { id: 'health-check', name: 'test' },
      }));
      
      await docClient.send(new DeleteCommand({
        TableName: 'users_certificate',
        Key: { id: 'health-check' },
      }));
      
      console.log('LocalStack is ready!');
      return;
    } catch (error) {
      retries++;
      console.log(`Waiting for LocalStack... (${retries}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Reduced from 2000ms to 1000ms
    }
  }
  
  throw new Error('LocalStack is not ready after 10 seconds. Please start LocalStack with: yarn docker:up');
};

export { waitForLocalStack };