# ============================================================================
# Outputs del Módulo de Backup
# ============================================================================

output "backup_bucket_name" {
  description = "Nombre del bucket S3 donde se almacenan los backups"
  value       = aws_s3_bucket.backup_bucket.id
}

output "backup_bucket_arn" {
  description = "ARN del bucket S3 de backups"
  value       = aws_s3_bucket.backup_bucket.arn
}

output "backup_lambda_arn" {
  description = "ARN de la función Lambda que ejecuta los backups"
  value       = aws_lambda_function.backup_function.arn
}

output "backup_lambda_name" {
  description = "Nombre de la función Lambda"
  value       = aws_lambda_function.backup_function.function_name
}

output "backup_schedule" {
  description = "Expresión cron del schedule configurado"
  value       = var.backup_schedule
}

output "sns_topic_arn" {
  description = "ARN del SNS topic para notificaciones"
  value       = aws_sns_topic.backup_notifications.arn
}

output "cloudwatch_log_group" {
  description = "Nombre del CloudWatch Log Group de Lambda"
  value       = aws_cloudwatch_log_group.backup_lambda_logs.name
}

output "eventbridge_rule_name" {
  description = "Nombre de la regla EventBridge que programa los backups"
  value       = aws_cloudwatch_event_rule.backup_schedule.name
}

output "manual_invoke_command" {
  description = "Comando AWS CLI para invocar backup manualmente"
  value = <<-EOT
    aws lambda invoke \
      --function-name ${aws_lambda_function.backup_function.function_name} \
      --payload '{"date": "${formatdate("YYYY-MM-DD", timestamp())}"}' \
      --region ${var.backup_region} \
      response.json
  EOT
}