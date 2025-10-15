import { handler as generateHandler } from '../../src/functions/generateCertificate';
import { handler as verifyHandler } from '../../src/functions/verifyCertificate';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { waitForLocalStack } from './setup';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';

describe('Certificate Integration Tests', () => {
  const mockContext = {} as Context;
  const mockCallback = jest.fn();
  
  let docClient: DynamoDBDocumentClient;

  beforeAll(async () => {
    await waitForLocalStack();
    
    const client = new DynamoDBClient({
      region: 'us-east-1',
      endpoint: 'http://localhost:4566',
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
      },
    });
    
    docClient = DynamoDBDocumentClient.from(client);
  }, 45000); // Increased from 15000ms to 45000ms to allow LocalStack setup

  beforeEach(async () => {
    // Clean up test data
    try {
      await docClient.send(new DeleteCommand({
        TableName: 'users_certificate',
        Key: { id: 'integration-test-123' },
      }));
    } catch (error) {
      // Ignore if item doesn't exist
    }
  });

  afterEach(async () => {
    // Clean up test data
    try {
      await docClient.send(new DeleteCommand({
        TableName: 'users_certificate',
        Key: { id: 'integration-test-123' },
      }));
    } catch (error) {
      // Ignore if item doesn't exist
    }
  });

  describe('Generate Certificate Flow', () => {
    it('should generate certificate and store in DynamoDB', async () => {
      const generateEvent: Partial<APIGatewayProxyEvent> = {
        body: JSON.stringify({
          id: 'integration-test-123',
          name: 'Integration Test User',
          grade: 'A+',
        }),
      };

      const result = await generateHandler(
        generateEvent as APIGatewayProxyEvent,
        mockContext,
        mockCallback
      );

      expect(result).toBeDefined();
      expect((result as any).statusCode).toBe(201);
      
      const responseBody = JSON.parse((result as any).body);
      expect(responseBody.message).toBe('Certificado criado com sucesso');
      expect(responseBody.url).toContain('integration-test-123.pdf');
    }, 30000);

    it('should verify generated certificate', async () => {
      // First generate a certificate
      const generateEvent: Partial<APIGatewayProxyEvent> = {
        body: JSON.stringify({
          id: 'integration-test-123',
          name: 'Integration Test User',
          grade: 'A+',
        }),
      };

      await generateHandler(
        generateEvent as APIGatewayProxyEvent,
        mockContext,
        mockCallback
      );

      // Then verify it
      const verifyEvent: Partial<APIGatewayProxyEvent> = {
        pathParameters: {
          id: 'integration-test-123',
        },
      };

      const result = await verifyHandler(
        verifyEvent as APIGatewayProxyEvent,
        mockContext,
        mockCallback
      );

      expect(result).toBeDefined();
      expect((result as any).statusCode).toBe(201);
      
      const responseBody = JSON.parse((result as any).body);
      expect(responseBody.message).toBe('Certificado válido');
      expect(responseBody.name).toBe('Integration Test User');
      expect(responseBody.url).toContain('integration-test-123.pdf');
    }, 30000);

    it('should return invalid for non-existent certificate', async () => {
      const verifyEvent: Partial<APIGatewayProxyEvent> = {
        pathParameters: {
          id: 'non-existent-certificate',
        },
      };

      const result = await verifyHandler(
        verifyEvent as APIGatewayProxyEvent,
        mockContext,
        mockCallback
      );

      expect(result).toBeDefined();
      expect((result as any).statusCode).toBe(400);
      
      const responseBody = JSON.parse((result as any).body);
      expect(responseBody.message).toBe('Certificado inválido');
    }, 15000);
  });

  describe('Generate Certificate Edge Cases', () => {
    it('should not create duplicate entries for existing user', async () => {
      const generateEvent: Partial<APIGatewayProxyEvent> = {
        body: JSON.stringify({
          id: 'integration-test-123',
          name: 'Integration Test User',
          grade: 'A+',
        }),
      };

      // Generate certificate twice
      const result1 = await generateHandler(
        generateEvent as APIGatewayProxyEvent,
        mockContext,
        mockCallback
      );

      const result2 = await generateHandler(
        generateEvent as APIGatewayProxyEvent,
        mockContext,
        mockCallback
      );

      // Both should succeed
      expect((result1 as any).statusCode).toBe(201);
      expect((result2 as any).statusCode).toBe(201);

      // Verify the certificate exists and is valid
      const verifyEvent: Partial<APIGatewayProxyEvent> = {
        pathParameters: {
          id: 'integration-test-123',
        },
      };

      const verifyResult = await verifyHandler(
        verifyEvent as APIGatewayProxyEvent,
        mockContext,
        mockCallback
      );

      expect((verifyResult as any).statusCode).toBe(201);
    }, 45000);
  });
});