# 📜 Certificate Generation Service

A serverless certificate generation and verification service built with AWS Lambda, DynamoDB, and S3.

## 🚀 Technologies

This project was developed with the following technologies:

- **[Node.js 20](https://nodejs.org/en/)** - JavaScript runtime
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Serverless Framework v4](https://serverless.com/)** - Serverless deployment
- **[AWS Lambda](https://aws.amazon.com/lambda/)** - Serverless compute
- **[AWS DynamoDB](https://aws.amazon.com/dynamodb/)** - NoSQL database
- **[AWS S3](https://aws.amazon.com/s3/)** - Object storage
- **[Puppeteer](https://github.com/puppeteer/puppeteer)** - PDF generation
- **[Handlebars](https://handlebarsjs.com/)** - Template engine
- **[Jest](https://jestjs.io/)** - Testing framework
- **[ESLint](https://eslint.org/)** - Code linting and formatting
- **[Docker](https://www.docker.com/)** - Containerization
- **[LocalStack](https://localstack.cloud/)** - Local AWS services

## 📋 Project Overview

This service provides two main functionalities:

1. **Certificate Generation**: Creates PDF certificates for users and stores metadata in DynamoDB
2. **Certificate Verification**: Validates existing certificates by ID

## 🛠️ Setup and Installation

### Prerequisites

- Node.js 20 or higher
- Yarn package manager
- Docker and Docker Compose (for local development)
- AWS CLI (for deployment)

### Local Development with Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nodejs-serverless
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Start LocalStack services**
   ```bash
   yarn docker:up
   ```
   This will start:
   - LocalStack (AWS services emulator) on port 4566
   - DynamoDB Admin UI on port 8001

4. **Run the application**
   ```bash
   yarn dev
   ```

5. **Access the services**
   - API: `http://localhost:3000`
   - DynamoDB Admin: `http://localhost:8001`

6. **Test the API**
   ```bash
   # Generate a certificate
   curl -X POST http://localhost:3000/dev/generateCertificate \
     -H "Content-Type: application/json" \
     -d '{"id": "test123", "name": "John Doe", "grade": "A+"}'
   
   # Verify a certificate
   curl http://localhost:3000/dev/verifyCertificate/test123
   ```

### Alternative: Local Development without Docker

1. **Install dependencies**
   ```bash
   yarn install
   ```

2. **Install DynamoDB Local**
   ```bash
   yarn dynamodb:install
   ```

3. **Start DynamoDB Local**
   ```bash
   yarn dynamodb:start
   ```

4. **Start the application** (in another terminal)
   ```bash
   yarn dev
   ```

## 🧪 Testing

### Code Quality
```bash
# Run ESLint to check code quality
yarn lint

# Fix linting issues automatically
yarn lint:fix
```

### Unit Tests
```bash
# Run unit tests (default, fast - no external dependencies required)
yarn test
yarn test:unit

# Run tests in watch mode
yarn test:watch

# Run tests with coverage report
yarn test:coverage
```

### Integration Tests
```bash
# Start LocalStack first (required for integration tests)
yarn docker:up

# Run integration tests (requires LocalStack running)
yarn test:integration
```

### Test Structure
- **Unit tests**: Located in `tests/unit/` - Fast tests with mocked dependencies (~1.6s)
  - `generateCertificate.test.ts` - 17 tests covering certificate generation
  - `verifyCertificate.test.ts` - 9 tests covering certificate verification
  - **Coverage**: 100% statements, 100% functions, 100% lines, 75% branches
  
- **Integration tests**: Located in `tests/integration/` - Full end-to-end tests with LocalStack (~30s)
  - Tests real AWS service interactions (DynamoDB, S3)
  - Requires Docker and LocalStack running
  
- **Test configurations**: 
  - `jest.unit.config.js` - Unit tests configuration with coverage
  - `jest.integration.config.js` - Integration tests configuration
  - `jest.config.js` - Base configuration
  
- **Coverage reports**: Generated in `coverage/` directory with:
  - HTML reports: `coverage/lcov-report/index.html`
  - Text summary in terminal
  - **Note**: `dynamodbClient.ts` is excluded from coverage (simple utility file)

### Test Coverage Goals
- **Target**: 100% coverage for main function files
- **Current Status**: ✅ 100% statements, 100% functions, 100% lines
- **View Coverage**: Open `coverage/lcov-report/index.html` in a browser after running `yarn test:coverage`

## 📡 API Endpoints

### Generate Certificate
- **Method**: `POST`
- **Endpoint**: `/generateCertificate`
- **Body**:
  ```json
  {
    "id": "user-unique-id",
    "name": "John Doe",
    "grade": "A+"
  }
  ```
- **Response** (New User):
  ```json
  {
    "message": "Certificate created successfully",
    "url": "https://certificadoignite2021.s3.amazonaws.com/user-unique-id.pdf"
  }
  ```
- **Response** (Existing User):
  ```json
  {
    "message": "Certificate already exists for this user",
    "url": "https://certificadoignite2021.s3.amazonaws.com/user-unique-id.pdf"
  }
  ```

### Verify Certificate
- **Method**: `GET`
- **Endpoint**: `/verifyCertificate/{id}`
- **Response** (Valid):
  ```json
  {
    "message": "Valid certificate",
    "name": "John Doe",
    "url": "https://certificadoignite2021.s3.amazonaws.com/user-unique-id.pdf"
  }
  ```
- **Response** (Invalid):
  ```json
  {
    "message": "Invalid certificate"
  }
  ```

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   API Gateway   │────▶│   AWS Lambda    │────▶│   DynamoDB      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │      S3         │
                        │  (PDF Storage)  │
                        └─────────────────┘
```

## 🚀 Deployment

### AWS Deployment

1. **Configure AWS credentials**
   ```bash
   aws configure
   ```

2. **Deploy to AWS**
   ```bash
   yarn deploy
   ```

### Environment Variables

The application uses the following environment variables:

- `IS_OFFLINE`: Set to 'true' for local development
- `AWS_REGION`: AWS region (default: us-east-1)
- `DYNAMODB_ENDPOINT`: DynamoDB endpoint (for local development)
- `S3_ENDPOINT`: S3 endpoint (for local development)

## 📁 Project Structure

```
├── src/
│   ├── functions/           # Lambda functions
│   │   ├── generateCertificate.ts  # Generate PDF certificates
│   │   └── verifyCertificate.ts    # Verify certificates by ID
│   ├── templates/           # Certificate templates
│   │   ├── certificate.hbs  # Handlebars template (English)
│   │   └── stamp.png        # Certificate medal/stamp
│   └── utils/               # Utility functions
│       └── dynamodbClient.ts  # DynamoDB client setup
├── tests/
│   ├── unit/               # Unit tests (26 tests, 100% coverage)
│   │   ├── generateCertificate.test.ts  # 17 tests
│   │   └── verifyCertificate.test.ts    # 9 tests
│   ├── integration/        # Integration tests (E2E with LocalStack)
│   │   ├── generateCertificate.integration.test.ts
│   │   └── verifyCertificate.integration.test.ts
│   └── setup.ts           # Test setup configuration
├── localstack-init/        # LocalStack initialization scripts
│   └── init.sh            # Creates DynamoDB tables and S3 buckets
├── coverage/              # Test coverage reports (generated)
│   └── lcov-report/       # HTML coverage reports
├── docker-compose.yml      # Docker services configuration
├── serverless.ts          # Serverless Framework configuration (TypeScript)
├── serverless.yml         # Generated serverless config
├── jest.config.js         # Base Jest configuration
├── jest.unit.config.js    # Unit tests configuration
├── jest.integration.config.js  # Integration tests configuration
├── eslint.config.js       # ESLint v9 flat configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies and scripts
```

## 🐳 Docker Commands

```bash
# Start services
yarn docker:up

# Stop services
yarn docker:down

# View logs
docker compose logs -f

# Access LocalStack container
docker exec -it certificate-localstack bash
```

## 🔧 Development Scripts

```bash
# Install dependencies
yarn install

# Start development server (with serverless-offline)
yarn dev

# Build TypeScript
yarn build

# Code Quality
yarn lint              # Check code quality
yarn lint:fix          # Fix linting issues automatically

# Testing
yarn test              # Run unit tests (default, fast)
yarn test:unit         # Same as yarn test
yarn test:watch        # Run tests in watch mode
yarn test:coverage     # Run tests with coverage report
yarn test:integration  # Run integration tests (requires LocalStack)

# Docker
yarn docker:up         # Start LocalStack services
yarn docker:down       # Stop LocalStack services

# Deployment
yarn deploy            # Deploy to AWS
```

## 📊 Test Coverage

Current test coverage for main function files:

| File | Statements | Branches | Functions | Lines |
|------|-----------|----------|-----------|-------|
| **generateCertificate.ts** | 100% | 70% | 100% | 100% |
| **verifyCertificate.ts** | 100% | 100% | 100% | 100% |
| **Overall** | 100% | 75% | 100% | 100% |

**Total Tests**: 26 passing (17 generateCertificate + 9 verifyCertificate)

### Viewing Coverage Reports
```bash
# Generate coverage report
yarn test:coverage

# Open HTML report in browser
open coverage/lcov-report/index.html
```

## 📊 Monitoring and Debugging

### LocalStack Services
- **Health Check**: `http://localhost:4566/_localstack/health`
- **DynamoDB Admin**: `http://localhost:8001`

### AWS CLI with LocalStack
```bash
# List DynamoDB tables
aws --endpoint-url=http://localhost:4566 dynamodb list-tables

# List S3 buckets
aws --endpoint-url=http://localhost:4566 s3 ls
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Troubleshooting

### Common Issues

1. **LocalStack not starting**: 
   - Ensure Docker is running and ports 4566, 8001 are available
   - Try `yarn docker:down` then `yarn docker:up`
   - Check logs with `docker compose logs localstack`
   - Verify health: `curl http://localhost:4566/_localstack/health`

2. **DynamoDB connection errors**: 
   - Verify LocalStack is healthy: `docker ps` (should show "healthy" status)
   - Check table creation: `docker exec certificate-localstack awslocal dynamodb list-tables`
   - Wait a few seconds after starting LocalStack for initialization to complete

3. **PDF generation fails**: 
   - Ensure Puppeteer dependencies are installed: `yarn install`
   - For integration tests, make sure LocalStack is running first: `yarn docker:up`
   - Check if chrome-aws-lambda is properly installed

4. **Tests failing**: 
   - **Unit tests**: Should work without LocalStack (`yarn test`)
   - **Integration tests**: Require LocalStack running first (`yarn docker:up` then `yarn test:integration`)
   - **ESLint issues**: Run `yarn lint:fix` to auto-fix code style issues
   - Clear Jest cache: `yarn jest --clearCache`

5. **TypeScript build errors**:
   - Run `yarn build` to check for type errors
   - Ensure all dependencies are installed: `yarn install`
   - Check `tsconfig.json` for proper configuration

6. **Port conflicts**:
   - **4566**: LocalStack main port
   - **8001**: DynamoDB Admin UI
   - **3000**: Serverless offline API
   - Stop any services using these ports before starting

7. **Coverage reports not accurate**:
   - Ensure you're running `yarn test:coverage` not just `yarn test`
   - Clear coverage cache: `rm -rf coverage/`
   - Note: `dynamodbClient.ts` is intentionally excluded from coverage

### Getting Help

- Check the [Serverless Framework documentation](https://www.serverless.com/framework/docs/)
- Review [LocalStack documentation](https://docs.localstack.cloud/)
- Review [Jest documentation](https://jestjs.io/)
- Open an issue in this repository

## 📝 Recent Updates

- ✅ **100% test coverage** achieved for main function files
- ✅ **26 comprehensive unit tests** (17 generateCertificate + 9 verifyCertificate)
- ✅ **Certificate template translated to English**
- ✅ **Integration tests** with real AWS services via LocalStack
- ✅ **ESLint v9** with flat configuration
- ✅ **TypeScript strict mode** enabled for type safety
- ✅ Separated unit and integration test configurations