// Mock DynamoDB client
const mockDocumentSend = jest.fn();

jest.mock('../../src/utils/dynamodbClient', () => ({
  document: {
    send: mockDocumentSend,
  },
}));

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  QueryCommand: jest.fn(),
}));

import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { handler } from '../../src/functions/verifyCertificate';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';

describe('verifyCertificate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(typeof handler).toBe('function');
  });

  it('should handle missing path parameters', async () => {
    const mockEvent = {
      pathParameters: null,
    } as unknown as APIGatewayProxyEvent;
    const mockContext = {} as Context;
    const mockCallback = jest.fn();

    const result = await handler(mockEvent, mockContext, mockCallback);

    expect(result).toEqual({
      statusCode: 400,
      body: JSON.stringify({
        message: 'Certificate ID is required',
      }),
    });
  });

  it('should handle missing id in path parameters', async () => {
    const mockEvent = {
      pathParameters: {},
    } as unknown as APIGatewayProxyEvent;
    const mockContext = {} as Context;
    const mockCallback = jest.fn();

    const result = await handler(mockEvent, mockContext, mockCallback);

    expect(result).toEqual({
      statusCode: 400,
      body: JSON.stringify({
        message: 'Certificate ID is required',
      }),
    });
  });

  it('should return certificate when user exists', async () => {
    const mockEvent = {
      pathParameters: {
        id: 'test123',
      },
    } as unknown as APIGatewayProxyEvent;
    const mockContext = {} as Context;
    const mockCallback = jest.fn();

    const mockUser = {
      id: 'test123',
      name: 'John Doe',
      grade: 'A+',
      created_at: 1634567890,
    };

    mockDocumentSend.mockResolvedValueOnce({
      Items: [mockUser],
    });

    const result = await handler(mockEvent, mockContext, mockCallback);

    expect(result!.statusCode).toBe(201);
    expect(JSON.parse(result!.body)).toEqual({
      message: 'Certificado válido',
      name: 'John Doe',
      url: 'https://certificadoignite2021.s3.amazonaws.com/test123.pdf',
    });

    expect(mockDocumentSend).toHaveBeenCalledTimes(1);
    expect(QueryCommand).toHaveBeenCalledWith({
      TableName: 'users_certificate',
      KeyConditionExpression: 'id = :id',
      ExpressionAttributeValues: {
        ':id': 'test123',
      },
    });
  });

  it('should return 400 when user does not exist', async () => {
    const mockEvent = {
      pathParameters: {
        id: 'nonexistent123',
      },
    } as unknown as APIGatewayProxyEvent;
    const mockContext = {} as Context;
    const mockCallback = jest.fn();

    mockDocumentSend.mockResolvedValueOnce({
      Items: [],
    });

    const result = await handler(mockEvent, mockContext, mockCallback);

    expect(result!.statusCode).toBe(400);
    expect(JSON.parse(result!.body)).toEqual({
      message: 'Certificado inválido',
    });

    expect(mockDocumentSend).toHaveBeenCalledTimes(1);
    expect(QueryCommand).toHaveBeenCalledWith({
      TableName: 'users_certificate',
      KeyConditionExpression: 'id = :id',
      ExpressionAttributeValues: {
        ':id': 'nonexistent123',
      },
    });
  });

  it('should handle DynamoDB errors', async () => {
    const mockEvent = {
      pathParameters: {
        id: 'test123',
      },
    } as unknown as APIGatewayProxyEvent;
    const mockContext = {} as Context;
    const mockCallback = jest.fn();

    mockDocumentSend.mockRejectedValueOnce(new Error('DynamoDB Connection Error'));

    await expect(
      handler(mockEvent, mockContext, mockCallback)
    ).rejects.toThrow('DynamoDB Connection Error');

    expect(mockDocumentSend).toHaveBeenCalledTimes(1);
  });

  it('should handle empty Items array', async () => {
    const mockEvent = {
      pathParameters: {
        id: 'test123',
      },
    } as unknown as APIGatewayProxyEvent;
    const mockContext = {} as Context;
    const mockCallback = jest.fn();

    mockDocumentSend.mockResolvedValueOnce({
      Items: [],
    });

    const result = await handler(mockEvent, mockContext, mockCallback);

    expect(result!.statusCode).toBe(400);
    expect(JSON.parse(result!.body)).toEqual({
      message: 'Certificado inválido',
    });
  });

  it('should handle undefined Items', async () => {
    const mockEvent = {
      pathParameters: {
        id: 'test123',
      },
    } as unknown as APIGatewayProxyEvent;
    const mockContext = {} as Context;
    const mockCallback = jest.fn();

    mockDocumentSend.mockResolvedValueOnce({
      Items: undefined,
    });

    const result = await handler(mockEvent, mockContext, mockCallback);

    expect(result!.statusCode).toBe(400);
    expect(JSON.parse(result!.body)).toEqual({
      message: 'Certificado inválido',
    });
  });

  it('should work with different user data', async () => {
    const mockEvent = {
      pathParameters: {
        id: 'user456',
      },
    } as unknown as APIGatewayProxyEvent;
    const mockContext = {} as Context;
    const mockCallback = jest.fn();

    const mockUser = {
      id: 'user456',
      name: 'Jane Smith',
      grade: 'B',
      created_at: 1634567891,
    };

    mockDocumentSend.mockResolvedValueOnce({
      Items: [mockUser],
    });

    const result = await handler(mockEvent, mockContext, mockCallback);

    expect(result!.statusCode).toBe(201);
    expect(JSON.parse(result!.body)).toEqual({
      message: 'Certificado válido',
      name: 'Jane Smith',
      url: 'https://certificadoignite2021.s3.amazonaws.com/user456.pdf',
    });
  });
});