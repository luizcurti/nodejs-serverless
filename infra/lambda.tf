data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  name               = "${var.project_name}-lambda"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Least-privilege permissions, matching the original serverless.ts
# iamRoleStatements exactly: DynamoDB read/write on this table only, S3
# put/get on the certificates bucket only.
data "aws_iam_policy_document" "lambda_permissions" {
  statement {
    sid       = "DynamoDbAccess"
    effect    = "Allow"
    actions   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:Query"]
    resources = [aws_dynamodb_table.users_certificate.arn]
  }

  statement {
    sid       = "S3CertificateAccess"
    effect    = "Allow"
    actions   = ["s3:PutObject", "s3:GetObject"]
    resources = ["${aws_s3_bucket.certificates.arn}/*"]
  }
}

resource "aws_iam_role_policy" "lambda_permissions" {
  name   = "${var.project_name}-lambda-permissions"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.lambda_permissions.json
}

resource "aws_cloudwatch_log_group" "generate_certificate" {
  name              = "/aws/lambda/${var.project_name}-generateCertificate"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "verify_certificate" {
  name              = "/aws/lambda/${var.project_name}-verifyCertificate"
  retention_in_days = var.log_retention_days
}

# Deployment packages are built by `yarn build:lambda` (scripts/build-lambda.js)
# into infra/build/<function>/ before `terraform apply`.
data "archive_file" "generate_certificate" {
  type        = "zip"
  source_dir  = "${path.module}/build/generateCertificate"
  output_path = "${path.module}/build/generateCertificate.zip"
}

data "archive_file" "verify_certificate" {
  type        = "zip"
  source_dir  = "${path.module}/build/verifyCertificate"
  output_path = "${path.module}/build/verifyCertificate.zip"
}

resource "aws_s3_object" "generate_certificate_package" {
  bucket = aws_s3_bucket.lambda_deployments.id
  key    = "generateCertificate/${data.archive_file.generate_certificate.output_md5}.zip"
  source = data.archive_file.generate_certificate.output_path
  etag   = data.archive_file.generate_certificate.output_md5
}

resource "aws_s3_object" "verify_certificate_package" {
  bucket = aws_s3_bucket.lambda_deployments.id
  key    = "verifyCertificate/${data.archive_file.verify_certificate.output_md5}.zip"
  source = data.archive_file.verify_certificate.output_path
  etag   = data.archive_file.verify_certificate.output_md5
}

locals {
  common_lambda_environment = {
    AWS_NODEJS_CONNECTION_REUSE_ENABLED = "1"
    NODE_OPTIONS                        = "--enable-source-maps --stack-trace-limit=1000"
    S3_BUCKET_NAME                      = aws_s3_bucket.certificates.bucket
  }
}

resource "aws_lambda_function" "generate_certificate" {
  function_name = "${var.project_name}-generateCertificate"
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs24.x"
  timeout       = var.generate_certificate_timeout
  memory_size   = var.lambda_memory_size

  s3_bucket        = aws_s3_bucket.lambda_deployments.id
  s3_key           = aws_s3_object.generate_certificate_package.key
  source_code_hash = data.archive_file.generate_certificate.output_base64sha256

  environment {
    variables = local.common_lambda_environment
  }

  depends_on = [aws_cloudwatch_log_group.generate_certificate]
}

resource "aws_lambda_function" "verify_certificate" {
  function_name = "${var.project_name}-verifyCertificate"
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs24.x"
  timeout       = var.verify_certificate_timeout
  memory_size   = var.lambda_memory_size

  s3_bucket        = aws_s3_bucket.lambda_deployments.id
  s3_key           = aws_s3_object.verify_certificate_package.key
  source_code_hash = data.archive_file.verify_certificate.output_base64sha256

  environment {
    variables = local.common_lambda_environment
  }

  depends_on = [aws_cloudwatch_log_group.verify_certificate]
}
