# --------------------------------------------
# Proveedor de AWS en la región especificada
# Se usa el profile "terraform" de AWS CLI, creado con aws configure
# --------------------------------------------
provider "aws" {
  region = var.aws_region
  profile = "terraform"
}

# Tabla amigo secreto
resource "aws_dynamodb_table" "session" {
  name           = "session"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }
  
  tags = {
    Name        = "session"
    Environment = "dev"
    Project     = "session"
  }
}


# Tabla amigo secreto
resource "aws_dynamodb_table" "amigo_secreto" {
  name           = "amigo_secreto"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"
  range_key      = "nickname"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "nickname"
    type = "S"
  }
  
  tags = {
    Name        = "amigo_secreto"
    Environment = "dev"
    Project     = "amigo_secreto"
  }
}


# -------------------------------------------------------------------
# Rol para Lambda
# -------------------------------------------------------------------
resource "aws_iam_role" "lambda_exec_role" {
  name = "lambda_exec_role_amigo_secreto"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# -------------------------------------------------------------------
# Política de IAM para acceso a DynamoDB
# -------------------------------------------------------------------
resource "aws_iam_policy" "dynamodb_rw_policy" {
  name        = "dynamodb_rw_policy_amigo_secreto"
  description = "Política para acceso de lectura/escritura a tablas de DynamoDB"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchWriteItem",
          "dynamodb:BatchGetItem",
          "dynamodb:DescribeTable"
        ]
        Resource = [
          "arn:aws:dynamodb:*:*:table/amigo_secreto",
          "arn:aws:dynamodb:*:*:table/amigo_secreto/index/*",
          "arn:aws:dynamodb:*:*:table/session",
          "arn:aws:dynamodb:*:*:table/session/index/*"
        ]
      }
    ]
  })
}

# -------------------------------------------------------------------
# Adjuntar la política al rol de Lambda
# -------------------------------------------------------------------
resource "aws_iam_role_policy_attachment" "lambda_dynamodb_access" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = aws_iam_policy.dynamodb_rw_policy.arn
}

# -------------------------------------------------------------------
# Generando zip del lambda
# -------------------------------------------------------------------
data "archive_file" "lambda_amigo_secreto_zip" {
  type        = "zip"
  source_dir  = "${path.root}/src/lambda_amigo_secreto"
  output_path = "${path.root}/build/lambda_amigo_secreto.zip"
}


# -------------------------------------------------------------------
# Lambda amigo secreto
# -------------------------------------------------------------------
resource "aws_lambda_function" "amigo_secreto_lambda" {
  function_name    = "amigo_secreto_lambda"
  role             = aws_iam_role.lambda_exec_role.arn
  handler          = "handler.lambda_handler"
  runtime          = "python3.12"
  filename         = data.archive_file.lambda_amigo_secreto_zip.output_path
  source_code_hash = data.archive_file.lambda_amigo_secreto_zip.output_base64sha256
}

# API Gateway REST API (a partir de YAML)
resource "aws_api_gateway_rest_api" "amigo_secreto_api" {
  name = "amigo-secreto-api"
  body = templatefile("${path.module}/src/api_amigo_secreto/api_amigo_secreto.yml.tmpl", {
    lambda_amigo_secreto_arn = aws_lambda_function.amigo_secreto_lambda.arn
  })
  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# Deployment del API
resource "aws_api_gateway_deployment" "amigo_secreto_deploy" {
  rest_api_id = aws_api_gateway_rest_api.amigo_secreto_api.id

  lifecycle {
    create_before_destroy = true
  }
  
  # Forzar nuevo deployment cuando cambie el swagger
  triggers = {
    redeployment = sha1(templatefile("${path.module}/src/api_amigo_secreto/api_amigo_secreto.yml.tmpl", {
      lambda_amigo_secreto_arn = aws_lambda_function.amigo_secreto_lambda.arn
    }))
  }
}

# Stage del API Gateway
resource "aws_api_gateway_stage" "amigo_secreto_stage" {
  rest_api_id   = aws_api_gateway_rest_api.amigo_secreto_api.id
  deployment_id = aws_api_gateway_deployment.amigo_secreto_deploy.id
  stage_name    = "dev"
  description   = "Stage de desarrollo para la API de asistencia"
  lifecycle {
    prevent_destroy = false
  }
}


# Permitir que API Gateway invoque el Lambda
resource "aws_lambda_permission" "apigw_invoke_lambda_amigo_secreto" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.amigo_secreto_lambda.arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.amigo_secreto_api.execution_arn}/*/*"
}