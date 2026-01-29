# --------------------------------------------
# Proveedor de AWS en la región especificada
# Se usa el profile "terraform" de AWS CLI, creado con aws configure
# --------------------------------------------
provider "aws" {
  region = var.aws_region
  profile = "terraform"
  default_tags {
    tags = var.tags
  }
}

terraform {
  backend "s3" {
    bucket         = "terraform-backend-app-tandamx"
    key            = "tandasmx/terraform.tfstate"
    region         = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}



# Tabla tandas
resource "aws_dynamodb_table" "tandas" {
  name           = "tandas"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "adminId"
    type = "S"
  }

  global_secondary_index {
    name            = "adminId-index"
    hash_key        = "adminId"
    projection_type = "ALL"
  }
  
  tags = {
    Name        = "tandas"
    Environment = "dev"
    Project     = "tandas"
  }
}


# Tabla participantes
resource "aws_dynamodb_table" "participantes" {
  name           = "participantes"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"
  range_key      = "participanteId"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "participanteId"
    type = "S"
  }
  
  tags = {
    Name        = "participantes"
    Environment = "dev"
    Project     = "participantes"
  }
}


# Tabla pagos
resource "aws_dynamodb_table" "pagos" {
  name           = "pagos"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"
  range_key      = "pagoId"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "pagoId"
    type = "S"
  }
  
  tags = {
    Name        = "pagos"
    Environment = "dev"
    Project     = "pagos"
  }
}


# Tabla notificaciones
resource "aws_dynamodb_table" "notificaciones" {
  name           = "notificaciones"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"
  
  attribute {
    name = "id"
    type = "S"
  }
  
  tags = {
    Name        = "notificaciones"
    Environment = "dev"
    Project     = "notificaciones"
  }
}


# Tabla usuarios_admin
resource "aws_dynamodb_table" "usuarios_admin" {
  name           = "usuarios_admin"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"
  
  
  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  global_secondary_index {
    name            = "email-index"
    hash_key        = "email"
    projection_type = "ALL"
  }
  
  tags = {
    Name        = "usuarios_admin"
    Environment = "dev"
    Project     = "usuarios_admin"
  }
}

# Nueva tabla: links_registro
resource "aws_dynamodb_table" "links_registro" {
  name           = "links_registro"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "token"

  attribute {
    name = "token"
    type = "S"
  }

  attribute {
    name = "tandaId"
    type = "S"
  }

  # Index para buscar por tandaId
  global_secondary_index {
    name            = "tandaId-index"
    hash_key        = "tandaId"
    projection_type = "ALL"
  }

  # TTL para auto-eliminación
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = {
    Name        = "TandasLinksRegistro"
    Environment = var.environment
  }
}


# -------------------------------------------------------------------
# Rol para Lambda
# -------------------------------------------------------------------
resource "aws_iam_role" "lambda_exec_role" {
  name = "lambda_exec_role_tandamx"

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

# Policy para SNS (envío de SMS)
resource "aws_iam_role_policy" "lambda_sns_policy" {
  name = "lambda-sns-tandamx-policy"
  role = aws_iam_role.lambda_exec_role.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sns:Publish",
          "sns:SetSMSAttributes",
          "sns:GetSMSAttributes"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# -------------------------------------------------------------------
# Política de IAM para acceso a DynamoDB
# -------------------------------------------------------------------
resource "aws_iam_policy" "dynamodb_rw_policy" {
  name        = "dynamodb_rw_policy_tandamx"
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
          "arn:aws:dynamodb:*:*:table/tandas",
          "arn:aws:dynamodb:*:*:table/tandas/index/*",
          "arn:aws:dynamodb:*:*:table/participantes",
          "arn:aws:dynamodb:*:*:table/participantes/index/*",
          "arn:aws:dynamodb:*:*:table/pagos",
          "arn:aws:dynamodb:*:*:table/pagos/index/*",
          "arn:aws:dynamodb:*:*:table/notificaciones",
          "arn:aws:dynamodb:*:*:table/notificaciones/index/*",
          "arn:aws:dynamodb:*:*:table/usuarios_admin",
          "arn:aws:dynamodb:*:*:table/usuarios_admin/index/*",
          "arn:aws:dynamodb:*:*:table/links_registro",
          "arn:aws:dynamodb:*:*:table/links_registro/index/*"
        ]
      }
    ]
  })
}

# -------------------------------------------------------------------
# Adjuntar la política dynamo al rol de Lambda
# -------------------------------------------------------------------
resource "aws_iam_role_policy_attachment" "lambda_dynamodb_access" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = aws_iam_policy.dynamodb_rw_policy.arn
}



# ========================================
# SNS TOPIC PARA SMS (OPCIONAL)
# ========================================

# Si quieres usar un Topic en lugar de enviar directo
resource "aws_sns_topic" "tanda_notifications" {
  name         = "tanda-manager-notifications"
  display_name = "Tanda Manager Notifications"
  
  tags = {
    Name = "tanda-manager-notifications"
  }
}

# Configuración de SMS predeterminada
#resource "aws_sns_sms_preferences" "default" {
#  default_sms_type         = "Transactional"  # o "Promotional"
#  delivery_status_iam_role_arn = aws_iam_role.sns_delivery_status.arn
  
  # Configuración para México
#  default_sender_id = "TandaMgr"  # Máximo 11 caracteres
  
  # Budget mensual en USD (0.50 por SMS en México)
#  monthly_spend_limit = "10"  # Máximo $100/mes en SMS
#}

# Role para delivery status de SNS
resource "aws_iam_role" "sns_delivery_status" {
  name = "tanda-manager-sns-delivery"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "sns.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "sns_delivery_status" {
  name = "sns-delivery-status-policy"
  role = aws_iam_role.sns_delivery_status.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:PutMetricFilter",
          "logs:PutRetentionPolicy"
        ]
        Resource = "*"
      }
    ]
  })
}

#layers
data "archive_file" "auth_layer_zip" {
  type        = "zip"
  source_dir  = "${path.module}/src/layers/auth_layer"
  output_path = "${path.module}/build/auth_layer.zip"
}

resource "aws_lambda_layer_version" "auth_layer" {
  layer_name          = "auth-python-layer"
  filename            = data.archive_file.auth_layer_zip.output_path
  source_code_hash    = data.archive_file.auth_layer_zip.output_base64sha256
  compatible_runtimes = ["python3.11", "python3.12"]

  description = "Lambda Layer auth"
}


# ========================================
# CREAR ARCHIVOS ZIP DE LAS LAMBDAS
# ========================================

# Comprimir código de autenticación
data "archive_file" "lambda_auth" {
  type        = "zip"
  source_dir = "${path.module}/src/lambdas/lambda_auth"
  output_path = "${path.module}/build/lambda_auth.zip"
}

# Comprimir código de tandas
data "archive_file" "lambda_tandas" {
  type        = "zip"
  source_dir = "${path.module}/src/lambdas/lambda_tandas"
  output_path = "${path.module}/build/lambda_tandas.zip"
}

# Comprimir código de participantes
data "archive_file" "lambda_participantes" {
  type        = "zip"
  source_dir = "${path.module}/src/lambdas/lambda_participantes"
  output_path = "${path.module}/build/lambda_participantes.zip"
}

# Comprimir código de pagos
data "archive_file" "lambda_pagos" {
  type        = "zip"
  source_dir = "${path.module}/src/lambdas/lambda_pagos"
  output_path = "${path.module}/build/lambda_pagos.zip"
}

# Comprimir código de notificaciones
data "archive_file" "lambda_notificaciones" {
  type        = "zip"
  source_dir = "${path.module}/src/lambdas/lambda_notificaciones"
  output_path = "${path.module}/build/lambda_notificaciones.zip"
}

# Comprimir código de authorizer
data "archive_file" "lambda_authorizer" {
  type        = "zip"
  source_dir = "${path.module}/src/lambdas/lambda_authorizer"
  output_path = "${path.module}/build/lambda_authorizer.zip"
}

# Comprimir código de estadisticas
data "archive_file" "lambda_estadisticas" {
  type        = "zip"
  source_dir = "${path.module}/src/lambdas/lambda_estadisticas"
  output_path = "${path.module}/build/lambda_estadisticas.zip"
}



# -------------------------------------------------------------------
# Lambda AUTENTICACIÓN
# -------------------------------------------------------------------
resource "aws_lambda_function" "lambda_auth" {
  filename         = data.archive_file.lambda_auth.output_path
  function_name    = "lambda-auth"
  role            = aws_iam_role.lambda_exec_role.arn
  handler         = "handler.lambda_handler"
  source_code_hash = data.archive_file.lambda_auth.output_base64sha256
  runtime         = "python3.12"
  timeout         = 30
  memory_size     = 256
  
  environment {
    variables = {
      USUARIOS_TABLE    = "usuarios_admin"
      JWT_SECRET        = var.jwt_secret
      JWT_REFRESH_SECRET = var.jwt_refresh_secret
    }
  }
  
  layers = [
    aws_lambda_layer_version.auth_layer.arn
  ]

  tags = {
    Name = "lambda_auth"
  }
}



# -------------------------------------------------------------------
# Lambda tandas
# -------------------------------------------------------------------
resource "aws_lambda_function" "lambda_tandas" {
  filename         = data.archive_file.lambda_tandas.output_path
  function_name    = "lambda-tandas"
  role            = aws_iam_role.lambda_exec_role.arn
  handler          = "handler.lambda_handler"
  source_code_hash = data.archive_file.lambda_tandas.output_base64sha256
  runtime         = "python3.12"
  timeout         = 30
  memory_size     = 256
  
  environment {
    variables = {
      TANDAS_TABLE       = aws_dynamodb_table.tandas.name
      USUARIOS_TABLE     = aws_dynamodb_table.usuarios_admin.name
      PARTICIPANTES_TABLE = aws_dynamodb_table.participantes.name
      PAGOS_TABLE        = aws_dynamodb_table.pagos.name
      JWT_SECRET         = var.jwt_secret
      APP_URL            = var.app_url
    }
  }

  layers = [
    aws_lambda_layer_version.auth_layer.arn
  ]
  
  tags = {
    Name = "lambda-tanda"
  }
}


# ========================================
# LAMBDA: PARTICIPANTES
# ========================================
resource "aws_lambda_function" "lambda_participantes" {
  filename         = data.archive_file.lambda_participantes.output_path
  function_name    = "lambda-participantes"
  role            = aws_iam_role.lambda_exec_role.arn
  handler          = "handler.lambda_handler"
  source_code_hash = data.archive_file.lambda_participantes.output_base64sha256
  runtime         = "python3.12"
  timeout         = 30
  memory_size     = 256
  
  environment {
    variables = {
      TANDAS_TABLE       = aws_dynamodb_table.tandas.name
      PARTICIPANTES_TABLE = aws_dynamodb_table.participantes.name
      JWT_SECRET         = var.jwt_secret
    }
  }

  layers = [
    aws_lambda_layer_version.auth_layer.arn
  ]
  
  tags = {
    Name = "lambda-participantes"
  }
}


# ========================================
# LAMBDA: PAGOS
# ========================================
resource "aws_lambda_function" "lambda_pagos" {
  filename         = data.archive_file.lambda_pagos.output_path
  function_name    = "lambda_pagos"
  role            = aws_iam_role.lambda_exec_role.arn
  handler          = "handler.lambda_handler"
  source_code_hash = data.archive_file.lambda_pagos.output_base64sha256
  runtime         = "python3.12"
  timeout         = 30
  memory_size     = 256
  
  environment {
    variables = {
      TANDAS_TABLE       = aws_dynamodb_table.tandas.name
      PARTICIPANTES_TABLE = aws_dynamodb_table.participantes.name
      PAGOS_TABLE        = aws_dynamodb_table.pagos.name
      JWT_SECRET         = var.jwt_secret
    }
  }

  layers = [
    aws_lambda_layer_version.auth_layer.arn
  ]
  
  tags = {
    Name = "lambda_pagos"
  }
}


# ========================================
# LAMBDA: NOTIFICACIONES
# ========================================
resource "aws_lambda_function" "lambda_notificaciones" {
  filename         = data.archive_file.lambda_notificaciones.output_path
  function_name    = "lambda-notificaciones"
  role            = aws_iam_role.lambda_exec_role.arn
  handler          = "handler.lambda_handler"
  source_code_hash = data.archive_file.lambda_notificaciones.output_base64sha256
  runtime         = "python3.12"
  timeout         = 30
  memory_size     = 256
  
  environment {
    variables = {
      TANDAS_TABLE         = aws_dynamodb_table.tandas.name
      PARTICIPANTES_TABLE   = aws_dynamodb_table.participantes.name
      NOTIFICACIONES_TABLE  = aws_dynamodb_table.notificaciones.name
      JWT_SECRET           = var.jwt_secret
    }
  }

  layers = [
    aws_lambda_layer_version.auth_layer.arn
  ]
  
  tags = {
    Name = "lambda-notificaciones"
  }
}


# ========================================
# LAMBDA: AUTHORIZER
# ========================================
resource "aws_lambda_function" "authorizer" {
  filename         = data.archive_file.lambda_authorizer.output_path
  function_name    = "tanda-manager-authorizer"
  role            = aws_iam_role.lambda_exec_role.arn
  handler         = "lambda_authorizer.handler"
  source_code_hash = data.archive_file.lambda_authorizer.output_base64sha256
  runtime         = "python3.12"
  timeout         = 10
  memory_size     = 128
  
  environment {
    variables = {
      JWT_SECRET = var.jwt_secret
    }
  }

  layers = [
    aws_lambda_layer_version.auth_layer.arn
  ]
  
  tags = {
    Name = "tanda-manager-authorizer"
  }
}

# ========================================
# LAMBDA: ESTADÍSTICAS
# ========================================
resource "aws_lambda_function" "estadisticas" {
  filename         = data.archive_file.lambda_estadisticas.output_path
  function_name    = "tanda_manager_estadisticas"
  role            = aws_iam_role.lambda_exec_role.arn
  handler          = "handler.lambda_handler"
  source_code_hash = data.archive_file.lambda_estadisticas.output_base64sha256
  runtime         = "python3.12"
  timeout         = 30
  memory_size     = 256
  
  environment {
    variables = {
      TANDAS_TABLE       = aws_dynamodb_table.tandas.name
      PARTICIPANTES_TABLE = aws_dynamodb_table.participantes.name
      PAGOS_TABLE        = aws_dynamodb_table.pagos.name
      JWT_SECRET         = var.jwt_secret
    }
  }

  layers = [
    aws_lambda_layer_version.auth_layer.arn
  ]
  
  tags = {
    Name = "tanda-manager-estadisticas"
  }
}



# ========================================
# API GATEWAY HTTP API
# ========================================

resource "aws_apigatewayv2_api" "main" {
  name          = "tandamx-api"
  protocol_type = "HTTP"
  
  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]
    max_age       = 300
  }
  
  tags = {
    Name = "tandamx-api"
  }
}

# Stage
resource "aws_apigatewayv2_stage" "main" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = var.environment
  auto_deploy = true
  
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
    })
  }
  
  tags = {
    Name = "tandamx-api-stage"
  }
}

# CloudWatch Log Group para API Gateway
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/api-gateway/tandamx-api"
  retention_in_days = 7
  
  tags = {
    Name = "tandamx-api-logs"
  }
}

# ========================================
# AUTHORIZER
# ========================================

resource "aws_apigatewayv2_authorizer" "jwt" {
  api_id           = aws_apigatewayv2_api.main.id
  authorizer_type  = "REQUEST"
  authorizer_uri   = aws_lambda_function.authorizer.invoke_arn
  identity_sources = ["$request.header.Authorization"]
  name             = "lambda-authorizer"  
  authorizer_payload_format_version = "2.0"
  enable_simple_responses           = true
}

# Permiso para que API Gateway invoque el Lambda Authorizer
resource "aws_lambda_permission" "authorizer" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.authorizer.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# ========================================
# INTEGRACIONES CON LAMBDAS
# ========================================

# Auth
resource "aws_apigatewayv2_integration" "auth" {
  api_id             = aws_apigatewayv2_api.main.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.lambda_auth.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "auth_login" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /auth/login"
  target    = "integrations/${aws_apigatewayv2_integration.auth.id}"
}

resource "aws_apigatewayv2_route" "auth_register" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /auth/register"
  target    = "integrations/${aws_apigatewayv2_integration.auth.id}"
}

resource "aws_apigatewayv2_route" "put_auth_register" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "PUT /auth/register"
  target    = "integrations/${aws_apigatewayv2_integration.auth.id}"
}

resource "aws_apigatewayv2_route" "auth_refresh" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /auth/refresh"
  target    = "integrations/${aws_apigatewayv2_integration.auth.id}"
}

resource "aws_apigatewayv2_route" "delete_account" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "DELETE /auth/account"
  target    = "integrations/${aws_apigatewayv2_integration.auth.id}"
}


resource "aws_lambda_permission" "auth" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.lambda_auth.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}


# tandas
resource "aws_apigatewayv2_integration" "tandas" {
  api_id             = aws_apigatewayv2_api.main.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.lambda_tandas.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "tandas_crear" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /tandas"
  target    = "integrations/${aws_apigatewayv2_integration.tandas.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}

resource "aws_apigatewayv2_route" "tandas_obtener" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /tandas/{tandaId}"
  target    = "integrations/${aws_apigatewayv2_integration.tandas.id}"
}

resource "aws_apigatewayv2_route" "tandas_actualizar" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "PUT /tandas/{tandaId}"
  target    = "integrations/${aws_apigatewayv2_integration.tandas.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}

resource "aws_apigatewayv2_route" "tandas_listar" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /tandas"
  target    = "integrations/${aws_apigatewayv2_integration.tandas.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}

resource "aws_apigatewayv2_route" "tandas_eliminar" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "DELETE /tandas/{tandaId}"
  target    = "integrations/${aws_apigatewayv2_integration.tandas.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}

resource "aws_apigatewayv2_route" "generar_link_registro" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /tandas/{tandaId}/registro-link"
  target    = "integrations/${aws_apigatewayv2_integration.tandas.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}

resource "aws_apigatewayv2_route" "obtener_datos_registro" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /registro/{token}"
  target    = "integrations/${aws_apigatewayv2_integration.tandas.id}"
  # Sin autorización (pública)
}

resource "aws_apigatewayv2_route" "obtener_link_vigente" {
  api_id = aws_apigatewayv2_api.main.id
  route_key = "GET /tandas/{tandaId}/registro-link/activo"
  target = "integrations/${aws_apigatewayv2_integration.tandas.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}


resource "aws_lambda_permission" "tandas" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.lambda_tandas.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}



# Participantes
resource "aws_apigatewayv2_integration" "participantes" {
  api_id             = aws_apigatewayv2_api.main.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.lambda_participantes.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "participantes_crear" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /tandas/{tandaId}/participantes"
  target    = "integrations/${aws_apigatewayv2_integration.participantes.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}

resource "aws_apigatewayv2_route" "participantes_listar" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /tandas/{tandaId}/participantes"
  target    = "integrations/${aws_apigatewayv2_integration.participantes.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}

resource "aws_apigatewayv2_route" "participantes_actualizar" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "PUT /tandas/{tandaId}/participantes/{participanteId}"
  target    = "integrations/${aws_apigatewayv2_integration.participantes.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}


resource "aws_apigatewayv2_route" "participantes_eliminar" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "DELETE /tandas/{tandaId}/participantes/{participanteId}"
  target    = "integrations/${aws_apigatewayv2_integration.participantes.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}

resource "aws_apigatewayv2_route" "registrar_participante_publico" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /registro/{token}"
  target    = "integrations/${aws_apigatewayv2_integration.participantes.id}"
  # Sin autorización (pública)
}

resource "aws_lambda_permission" "participantes" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.lambda_participantes.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}


# Pagos
resource "aws_apigatewayv2_integration" "pagos" {
  api_id             = aws_apigatewayv2_api.main.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.lambda_pagos.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "pagos_crear" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /tandas/{tandaId}/pagos"
  target    = "integrations/${aws_apigatewayv2_integration.pagos.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}

resource "aws_apigatewayv2_route" "pagos_obtener" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /tandas/{tandaId}/pagos"
  target    = "integrations/${aws_apigatewayv2_integration.pagos.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}

resource "aws_apigatewayv2_route" "pagos_obtener_matriz" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /tandas/{tandaId}/pagos/matriz"
  target    = "integrations/${aws_apigatewayv2_integration.pagos.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}

resource "aws_apigatewayv2_route" "pagos_actualizar" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "PUT /tandas/{tandaId}/pagos/{pagoId}"
  target    = "integrations/${aws_apigatewayv2_integration.pagos.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}

resource "aws_lambda_permission" "pagos" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.lambda_pagos.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}


# notificaciones
resource "aws_apigatewayv2_integration" "notificaciones" {
  api_id             = aws_apigatewayv2_api.main.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.lambda_notificaciones.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "notificaciones_recordatorio" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /tandas/{tandaId}/notificaciones/recordatorio"
  target    = "integrations/${aws_apigatewayv2_integration.notificaciones.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}

resource "aws_apigatewayv2_route" "notificaciones_recordatorio_masivo" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /tandas/{tandaId}/notificaciones/recordatorio-masivo"
  target    = "integrations/${aws_apigatewayv2_integration.notificaciones.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}

resource "aws_apigatewayv2_route" "notificaciones_obtener" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /tandas/{tandaId}/notificaciones"
  target    = "integrations/${aws_apigatewayv2_integration.notificaciones.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}

resource "aws_lambda_permission" "notificaciones" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.lambda_notificaciones.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}


# estadisticas
resource "aws_apigatewayv2_integration" "estadisticas" {
  api_id             = aws_apigatewayv2_api.main.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.estadisticas.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "estadisticas" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /tandas/{tandaId}/estadisticas"
  target    = "integrations/${aws_apigatewayv2_integration.estadisticas.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}

resource "aws_apigatewayv2_route" "reportes" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /tandas/{tandaId}/reporte"
  target    = "integrations/${aws_apigatewayv2_integration.estadisticas.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}


resource "aws_lambda_permission" "estadisticas" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.estadisticas.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}