output "api_endpoint" {
  description = "Base URL of the HTTP API"
  value       = aws_apigatewayv2_api.this.api_endpoint
}

output "dynamodb_table_name" {
  value = aws_dynamodb_table.users_certificate.name
}

output "certificate_bucket_name" {
  value = aws_s3_bucket.certificates.bucket
}
