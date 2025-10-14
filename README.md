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

### Unit Tests
```bash
# Run unit tests
yarn test

# Run tests in watch mode
yarn test:watch

# Run tests with coverage
yarn test:coverage
```

### Integration Tests
```bash
# Start LocalStack first
yarn docker:up

# Run integration tests
yarn test:integration
```

### Test Structure
- **Unit tests**: Located in `tests/unit/`
- **Integration tests**: Located in `tests/integration/`
- **Test configuration**: `jest.config.js` and `jest.integration.config.js`

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
- **Response**:
  ```json
  {
    "message": "Certificado criado com sucesso",
    "url": "https://certificadoignite2021.s3.amazonaws.com/user-unique-id.pdf"
  }
  ```

### Verify Certificate
- **Method**: `GET`
- **Endpoint**: `/verifyCertificate/{id}`
- **Response** (Valid):
  ```json
  {
    "message": "Certificado válido",
    "name": "John Doe",
    "url": "https://certificadoignite2021.s3.amazonaws.com/user-unique-id.pdf"
  }
  ```
- **Response** (Invalid):
  ```json
  {
    "message": "Certificado inválido"
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
│   │   ├── generateCertificate.ts
│   │   └── verifyCertificate.ts
│   ├── templates/           # Certificate templates
│   │   ├── certificate.hbs
│   │   └── stamp.png
│   └── utils/               # Utility functions
│       └── dynamodbClient.ts
├── tests/
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── setup.ts           # Test setup
├── localstack-init/        # LocalStack initialization
├── docker-compose.yml      # Docker services
├── serverless.ts          # Serverless configuration
├── jest.config.js         # Jest configuration
└── package.json           # Dependencies and scripts
```

## 🐳 Docker Commands

```bash
# Start services
yarn docker:up

# Stop services
yarn docker:down

# View logs
docker-compose logs -f

# Access LocalStack container
docker exec -it certificate-localstack bash
```

## 🔧 Development Scripts

```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Build TypeScript
yarn build

# Run linting
yarn lint

# Fix linting issues
yarn lint:fix

# Run all tests
yarn test

# Run integration tests
yarn test:integration

# Generate test coverage
yarn test:coverage
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

1. **LocalStack not starting**: Ensure Docker is running and ports 4566, 8001 are available
2. **DynamoDB connection errors**: Check if LocalStack is running and properly initialized
3. **PDF generation fails**: Ensure Puppeteer dependencies are installed
4. **Tests failing**: Make sure LocalStack is running for integration tests

### Getting Help

- Check the [Serverless Framework documentation](https://www.serverless.com/framework/docs/)
- Review [LocalStack documentation](https://docs.localstack.cloud/)
- Open an issue in this repository