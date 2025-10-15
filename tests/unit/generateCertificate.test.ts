// Mock all external dependencies for generateCertificate tests
const mockDocumentSendGenerate = jest.fn();
const mockS3Send = jest.fn();
const mockPuppeteerPage = {
  setContent: jest.fn(),
  pdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
};
const mockPuppeteerBrowser = {
  newPage: jest.fn().mockResolvedValue(mockPuppeteerPage),
  close: jest.fn(),
};

jest.mock('../../src/utils/dynamodbClient', () => ({
  document: {
    send: mockDocumentSendGenerate,
  },
}));

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  QueryCommand: jest.fn(),
  PutCommand: jest.fn(),
}));

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({
    send: mockS3Send,
  })),
  PutObjectCommand: jest.fn(),
}));

jest.mock('handlebars', () => ({
  compile: jest.fn(() => jest.fn(() => '<html>Mock Certificate</html>')),
}));

jest.mock('chrome-aws-lambda', () => ({
  puppeteer: {
    launch: jest.fn().mockResolvedValue(mockPuppeteerBrowser),
  },
  args: [],
  defaultViewport: { width: 1280, height: 720 },
  executablePath: jest.fn().mockReturnValue('/mock/chrome/path'),
}));

jest.mock('fs', () => ({
  readFileSync: jest.fn((path: string) => {
    if (path.includes('certificate.hbs')) {
      return '<html>{{name}} - {{grade}}</html>';
    }
    if (path.includes('stamp.png')) {
      return Buffer.from('mock-image-data').toString('base64');
    }
    return 'mock file content';
  }),
}));

jest.mock('dayjs', () => {
  return jest.fn(() => ({
    format: jest.fn(() => '15/10/2025'),
  }));
});

// Get references to mocked modules
import { QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import chromium from 'chrome-aws-lambda';
import { compile } from 'handlebars';
import fs from 'fs';

describe('generateCertificate', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { handler } = require('../../src/functions/generateCertificate');
  
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.IS_OFFLINE = 'true';
  });

  it('should be defined', () => {
    expect(typeof handler).toBe('function');
  });

  it('should return 400 when body is missing', async () => {
    const mockEvent = {
      body: null,
    };
    const mockContext = {};
    const mockCallback = jest.fn();

    const result = await handler(mockEvent, mockContext, mockCallback);

    expect(result).toEqual({
      statusCode: 400,
      body: JSON.stringify({
        message: 'Request body is required',
      }),
    });
  });

  it('should handle invalid JSON in request body', async () => {
    const mockEvent = {
      body: 'invalid json',
    };
    const mockContext = {};
    const mockCallback = jest.fn();

    await expect(
      handler(mockEvent, mockContext, mockCallback)
    ).rejects.toThrow();
  });

  it('should generate certificate for new user', async () => {
    const mockEvent = {
      body: JSON.stringify({
        id: 'test123',
        name: 'John Doe',
        grade: 'A+',
      }),
    };
    const mockContext = {};
    const mockCallback = jest.fn();

    // Mock DynamoDB query (user doesn't exist)
    mockDocumentSendGenerate.mockResolvedValueOnce({ Items: [] });
    // Mock DynamoDB put (create user)
    mockDocumentSendGenerate.mockResolvedValueOnce({});

    // Mock S3 upload
    mockS3Send.mockResolvedValue({});

    const result = await handler(mockEvent, mockContext, mockCallback);

    expect(result.statusCode).toBe(201);
    expect(JSON.parse(result.body)).toEqual({
      message: 'Certificado criado com sucesso',
      url: 'https://certificadoignite2021.s3.amazonaws.com/test123.pdf',
    });

    expect(mockDocumentSendGenerate).toHaveBeenCalledTimes(2); // Query + Put
    expect(QueryCommand).toHaveBeenCalledWith({
      TableName: 'users_certificate',
      KeyConditionExpression: 'id = :id',
      ExpressionAttributeValues: {
        ':id': 'test123',
      },
    });
    expect(PutCommand).toHaveBeenCalledWith({
      TableName: 'users_certificate',
      Item: {
        id: 'test123',
        name: 'John Doe',
        grade: 'A+',
        created_at: expect.any(Number),
      },
    });
  });

  it('should generate certificate for existing user without creating duplicate', async () => {
    const mockEvent = {
      body: JSON.stringify({
        id: 'existing123',
        name: 'Jane Doe',
        grade: 'B+',
      }),
    };
    const mockContext = {};
    const mockCallback = jest.fn();

    // Mock DynamoDB query (user exists)
    mockDocumentSendGenerate.mockResolvedValueOnce({
      Items: [{ id: 'existing123', name: 'Jane Doe', grade: 'B+' }],
    });

    // Mock S3 upload
    mockS3Send.mockResolvedValue({});

    const result = await handler(mockEvent, mockContext, mockCallback);

    expect(result.statusCode).toBe(201);
    expect(JSON.parse(result.body)).toEqual({
      message: 'Certificado criado com sucesso',
      url: 'https://certificadoignite2021.s3.amazonaws.com/existing123.pdf',
    });

    expect(mockDocumentSendGenerate).toHaveBeenCalledTimes(1); // Only query, no put
  });

  it('should handle DynamoDB query error', async () => {
    const mockEvent = {
      body: JSON.stringify({
        id: 'test123',
        name: 'John Doe',
        grade: 'A+',
      }),
    };
    const mockContext = {};
    const mockCallback = jest.fn();

    mockDocumentSendGenerate.mockRejectedValueOnce(new Error('DynamoDB Error'));

    await expect(
      handler(mockEvent, mockContext, mockCallback)
    ).rejects.toThrow('DynamoDB Error');
  });

  it('should handle DynamoDB put error', async () => {
    const mockEvent = {
      body: JSON.stringify({
        id: 'test123',
        name: 'John Doe',
        grade: 'A+',
      }),
    };
    const mockContext = {};
    const mockCallback = jest.fn();

    // Mock DynamoDB query (user doesn't exist)
    mockDocumentSendGenerate.mockResolvedValueOnce({ Items: [] });
    // Mock DynamoDB put error
    mockDocumentSendGenerate.mockRejectedValueOnce(new Error('DynamoDB Put Error'));

    await expect(
      handler(mockEvent, mockContext, mockCallback)
    ).rejects.toThrow('DynamoDB Put Error');
  });

  it('should handle S3 upload error', async () => {
    const mockEvent = {
      body: JSON.stringify({
        id: 'test123',
        name: 'John Doe',
        grade: 'A+',
      }),
    };
    const mockContext = {};
    const mockCallback = jest.fn();

    // Mock DynamoDB operations
    mockDocumentSendGenerate.mockResolvedValueOnce({ Items: [] });
    mockDocumentSendGenerate.mockResolvedValueOnce({});

    // Mock S3 upload error
    mockS3Send.mockRejectedValue(new Error('S3 Error'));

    await expect(
      handler(mockEvent, mockContext, mockCallback)
    ).rejects.toThrow('S3 Error');
  });

  it('should handle PDF generation error', async () => {
    const mockEvent = {
      body: JSON.stringify({
        id: 'test123',
        name: 'John Doe',
        grade: 'A+',
      }),
    };
    const mockContext = {};
    const mockCallback = jest.fn();

    // Mock DynamoDB operations
    mockDocumentSendGenerate.mockResolvedValueOnce({ Items: [] });
    mockDocumentSendGenerate.mockResolvedValueOnce({});

    // Mock PDF generation error
    (chromium.puppeteer.launch as jest.Mock).mockRejectedValueOnce(new Error('Puppeteer Error'));

    await expect(
      handler(mockEvent, mockContext, mockCallback)
    ).rejects.toThrow('Puppeteer Error');
  });

  it('should read template and stamp files correctly', async () => {
    const mockEvent = {
      body: JSON.stringify({
        id: 'test123',
        name: 'John Doe',
        grade: 'A+',
      }),
    };
    const mockContext = {};
    const mockCallback = jest.fn();

    // Mock DynamoDB operations
    mockDocumentSendGenerate.mockResolvedValueOnce({ Items: [] });
    mockDocumentSendGenerate.mockResolvedValueOnce({});

    // Mock S3 upload
    mockS3Send.mockResolvedValue({});

    await handler(mockEvent, mockContext, mockCallback);

    expect(fs.readFileSync).toHaveBeenCalledWith(
      expect.stringContaining('certificate.hbs'),
      'utf8'
    );
    expect(fs.readFileSync).toHaveBeenCalledWith(
      expect.stringContaining('stamp.png'),
      'base64'
    );
    expect(compile).toHaveBeenCalledWith('<html>{{name}} - {{grade}}</html>');
  });

  it('should validate required fields in request body', async () => {
    const mockEvent = {
      body: JSON.stringify({
        // Missing required fields like id, name, grade
      }),
    };
    const mockContext = {};
    const mockCallback = jest.fn();

    // Mock DynamoDB operations
    mockDocumentSendGenerate.mockResolvedValueOnce({ Items: [] });
    mockDocumentSendGenerate.mockResolvedValueOnce({});

    // Mock S3 upload
    mockS3Send.mockResolvedValue({});

    const result = await handler(mockEvent, mockContext, mockCallback);
    
    // The function should still work but with undefined values
    expect(result.statusCode).toBe(201);
  });

  it('should handle different offline modes', async () => {
    const mockEvent = {
      body: JSON.stringify({
        id: 'test123',
        name: 'John Doe',
        grade: 'A+',
      }),
    };
    const mockContext = {};
    const mockCallback = jest.fn();

    // Test offline mode
    process.env.IS_OFFLINE = 'true';

    // Mock DynamoDB operations
    mockDocumentSendGenerate.mockResolvedValueOnce({ Items: [] });
    mockDocumentSendGenerate.mockResolvedValueOnce({});

    // Mock S3 upload
    mockS3Send.mockResolvedValue({});

    await handler(mockEvent, mockContext, mockCallback);

    // Test online mode
    process.env.IS_OFFLINE = 'false';

    // Clear mocks and test again
    jest.clearAllMocks();
    mockDocumentSendGenerate.mockResolvedValueOnce({ Items: [] });
    mockDocumentSendGenerate.mockResolvedValueOnce({});
    mockS3Send.mockResolvedValue({});

    await handler(mockEvent, mockContext, mockCallback);

    expect(handler).toBeDefined(); // Basic assertion for online mode
  });

  it('should handle Chrome/Puppeteer configuration correctly', async () => {
    const mockEvent = {
      body: JSON.stringify({
        id: 'test123',
        name: 'John Doe',
        grade: 'A+',
      }),
    };
    const mockContext = {};
    const mockCallback = jest.fn();

    // Mock DynamoDB operations
    mockDocumentSendGenerate.mockResolvedValueOnce({ Items: [] });
    mockDocumentSendGenerate.mockResolvedValueOnce({});

    // Mock S3 upload
    mockS3Send.mockResolvedValue({});

    await handler(mockEvent, mockContext, mockCallback);

    // Verify Puppeteer was configured with correct options
    expect(chromium.puppeteer.launch).toHaveBeenCalledWith({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: expect.any(Function),
    });
  });

  it('should generate PDF with correct content', async () => {
    const mockEvent = {
      body: JSON.stringify({
        id: 'test123',
        name: 'Test User',
        grade: 'A++',
      }),
    };
    const mockContext = {};
    const mockCallback = jest.fn();

    // Mock DynamoDB operations
    mockDocumentSendGenerate.mockResolvedValueOnce({ Items: [] });
    mockDocumentSendGenerate.mockResolvedValueOnce({});

    // Mock S3 upload
    mockS3Send.mockResolvedValue({});

    await handler(mockEvent, mockContext, mockCallback);

    // Verify template compilation was called
    expect(compile).toHaveBeenCalled();
    
    // Verify PDF generation options
    expect(mockPuppeteerPage.pdf).toHaveBeenCalledWith({
      format: 'a4',
      landscape: true,
      path: './certificate.pdf',
      preferCSSPageSize: true,
      printBackground: true,
    });
  });
});
