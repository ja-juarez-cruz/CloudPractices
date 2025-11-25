# --------------------------------------------
# Proveedor de AWS en la región especificada
# Se usa el profile "terraform" de AWS CLI, creado con aws configure
# --------------------------------------------
provider "aws" {
  region = var.aws_region
  profile = "terraform_sanca"
}

# =========================================
# S3 BUCKET PARA BACKUPS
# =========================================

resource "aws_s3_bucket" "backup_bucket" {
  bucket = "${var.project_name}-dynamodb-backups-${var.environment}"

  tags = {
    Name        = "DynamoDB Backups"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Bloquear acceso público
resource "aws_s3_bucket_public_access_block" "backup_bucket" {
  bucket = aws_s3_bucket.backup_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Versionado para protección adicional
resource "aws_s3_bucket_versioning" "backup_bucket" {
  bucket = aws_s3_bucket.backup_bucket.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Cifrado por defecto
resource "aws_s3_bucket_server_side_encryption_configuration" "backup_bucket" {
  bucket = aws_s3_bucket.backup_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Lifecycle policy para optimización de costos
resource "aws_s3_bucket_lifecycle_configuration" "backup_bucket" {
  bucket = aws_s3_bucket.backup_bucket.id

  rule {
    id     = "transition-to-glacier"
    status = "Enabled"

    # Backups mayores a 7 días -> Glacier (más barato)
    transition {
      days          = 7
      storage_class = "GLACIER_IR"
    }

    # Eliminar backups después del período de retención
    expiration {
      days = var.backup_retention_days
    }

    # Limpiar versiones antiguas
    noncurrent_version_expiration {
      noncurrent_days = 7
    }
  }
}

# =========================================
# IAM ROLE PARA LAMBDA
# =========================================

resource "aws_iam_role" "backup_lambda_role" {
  name = "${var.project_name}-backup-lambda-role-${var.environment}"

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

  tags = {
    Name = "DynamoDB Backup Lambda Role"
  }
}

# Policy para acceso a DynamoDB
resource "aws_iam_role_policy" "dynamodb_access" {
  name = "dynamodb-read-access"
  role = aws_iam_role.backup_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:Scan",
          "dynamodb:DescribeTable",
          "dynamodb:ListTables"
        ]
        Resource = [
          "arn:aws:dynamodb:${data.aws_region.current.id}:${data.aws_caller_identity.current.account_id}:table/alumnos",
          "arn:aws:dynamodb:${data.aws_region.current.id}:${data.aws_caller_identity.current.account_id}:table/asistencias",
          "arn:aws:dynamodb:${data.aws_region.current.id}:${data.aws_caller_identity.current.account_id}:table/asistencias_materias",
          "arn:aws:dynamodb:${data.aws_region.current.id}:${data.aws_caller_identity.current.account_id}:table/calificaciones",
          "arn:aws:dynamodb:${data.aws_region.current.id}:${data.aws_caller_identity.current.account_id}:table/conceptos_evaluacion",
          "arn:aws:dynamodb:${data.aws_region.current.id}:${data.aws_caller_identity.current.account_id}:table/escuelas",
          "arn:aws:dynamodb:${data.aws_region.current.id}:${data.aws_caller_identity.current.account_id}:table/grados",
          "arn:aws:dynamodb:${data.aws_region.current.id}:${data.aws_caller_identity.current.account_id}:table/maestros",
          "arn:aws:dynamodb:${data.aws_region.current.id}:${data.aws_caller_identity.current.account_id}:table/materias",
          "arn:aws:dynamodb:${data.aws_region.current.id}:${data.aws_caller_identity.current.account_id}:table/periodos_escolares",
          "arn:aws:dynamodb:${data.aws_region.current.id}:${data.aws_caller_identity.current.account_id}:table/prefectos",
          "arn:aws:dynamodb:${data.aws_region.current.id}:${data.aws_caller_identity.current.account_id}:table/settings",
          "arn:aws:dynamodb:${data.aws_region.current.id}:${data.aws_caller_identity.current.account_id}:table/staff",
          "arn:aws:dynamodb:${data.aws_region.current.id}:${data.aws_caller_identity.current.account_id}:table/tutores",
          "arn:aws:dynamodb:${data.aws_region.current.id}:${data.aws_caller_identity.current.account_id}:table/usuarios"
        ]
      }
    ]
  })
}

# Policy para acceso a S3
resource "aws_iam_role_policy" "s3_access" {
  name = "s3-backup-access"
  role = aws_iam_role.backup_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:PutObjectAcl",
          "s3:GetObject"
        ]
        Resource = "${aws_s3_bucket.backup_bucket.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.backup_bucket.arn
      }
    ]
  })
}

# Policy para CloudWatch Logs y Metrics
resource "aws_iam_role_policy" "cloudwatch_access" {
  name = "cloudwatch-access"
  role = aws_iam_role.backup_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData"
        ]
        Resource = "*"
      }
    ]
  })
}

# =========================================
# LAMBDA FUNCTION
# =========================================

# Archivo ZIP del código Lambda
data "archive_file" "lambda_zip" {
  type        = "zip"
  output_path = "${path.module}/lambdas/src_zip/backup_tablas_dynamo.zip"
  source_dir  = "${path.module}/lambdas/src/backup_tablas_dynamo"
}

resource "aws_lambda_function" "backup_function" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "${var.project_name}-dynamodb-backup-${var.environment}"
  role            = aws_iam_role.backup_lambda_role.arn
  handler         = "handler.lambda_handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "python3.11"
  timeout         = 900  # 15 minutos (máximo permitido)
  memory_size     = 1024 # 1GB RAM

  environment {
    variables = {
      BACKUP_BUCKET        = aws_s3_bucket.backup_bucket.bucket
      BACKUP_PREFIX        = "backups"
      COMPRESSION_ENABLED  = var.enable_compression
      AWS_REGION_ID          = data.aws_region.current.id
    }
  }

  tags = {
    Name        = "DynamoDB Backup Function"
    Environment = var.environment
  }
}

# CloudWatch Log Group con retención
resource "aws_cloudwatch_log_group" "backup_logs" {
  name              = "/aws/lambda/${aws_lambda_function.backup_function.function_name}"
  retention_in_days = 14

  tags = {
    Name = "DynamoDB Backup Logs"
  }
}

# =========================================
# EVENTBRIDGE SCHEDULER
# =========================================

resource "aws_cloudwatch_event_rule" "backup_schedule" {
  name                = "${var.project_name}-backup-schedule-${var.environment}"
  description         = "Trigger DynamoDB backup Monday to Friday at 2 AM"
  schedule_expression = var.backup_schedule

  tags = {
    Name = "DynamoDB Backup Schedule"
  }
}

resource "aws_cloudwatch_event_target" "lambda_target" {
  rule      = aws_cloudwatch_event_rule.backup_schedule.name
  target_id = "BackupLambda"
  arn       = aws_lambda_function.backup_function.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backup_function.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.backup_schedule.arn
}

# =========================================
# CLOUDWATCH ALARMS
# =========================================

resource "aws_cloudwatch_metric_alarm" "backup_failures" {
  alarm_name          = "${var.project_name}-backup-failures-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FailedBackups"
  namespace           = "DynamoDBBackup"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Alerta cuando fallan backups de DynamoDB"
  treat_missing_data  = "notBreaching"

  alarm_actions = var.alert_email != "" ? [aws_sns_topic.backup_alerts[0].arn] : []

  tags = {
    Name = "Backup Failure Alert"
  }
}

resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "${var.project_name}-backup-lambda-errors-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Alerta cuando Lambda de backup falla"

  dimensions = {
    FunctionName = aws_lambda_function.backup_function.function_name
  }

  alarm_actions = var.alert_email != "" ? [aws_sns_topic.backup_alerts[0].arn] : []
}

# =========================================
# SNS PARA ALERTAS (OPCIONAL)
# =========================================

resource "aws_sns_topic" "backup_alerts" {
  count = var.alert_email != "" ? 1 : 0
  name  = "${var.project_name}-backup-alerts-${var.environment}"

  tags = {
    Name = "DynamoDB Backup Alerts"
  }
}

resource "aws_sns_topic_subscription" "email_alerts" {
  count     = var.alert_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.backup_alerts[0].arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# =========================================
# DATA SOURCES
# =========================================

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}