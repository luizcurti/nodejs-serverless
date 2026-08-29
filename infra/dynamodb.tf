# Provisioned 5/5 matches the throughput the previous serverless.ts config
# requested. For a low/spiky-traffic service like this, PAY_PER_REQUEST
# (on-demand) billing is usually a better fit - consider switching once
# real traffic patterns are known.
resource "aws_dynamodb_table" "users_certificate" {
  name           = var.dynamodb_table_name
  billing_mode   = "PROVISIONED"
  read_capacity  = 5
  write_capacity = 5
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }
}
