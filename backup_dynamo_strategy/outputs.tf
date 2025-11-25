# =========================================
# OUTPUTS
# =========================================

output "backup_bucket_name" {
  description = "Nombre del bucket S3 de backups"
  value       = aws_s3_bucket.backup_bucket.bucket
}

output "backup_bucket_arn" {
  description = "ARN del bucket S3"
  value       = aws_s3_bucket.backup_bucket.arn
}

output "lambda_function_name" {
  description = "Nombre de la función Lambda"
  value       = aws_lambda_function.backup_function.function_name
}

output "lambda_function_arn" {
  description = "ARN de la función Lambda"
  value       = aws_lambda_function.backup_function.arn
}

output "backup_schedule" {
  description = "Expresión cron del schedule"
  value       = var.backup_schedule
}

output "cloudwatch_log_group" {
  description = "Log group de CloudWatch"
  value       = aws_cloudwatch_log_group.backup_logs.name
}

output "manual_invoke_command" {
  description = "Comando para ejecutar backup manualmente"
  value       = "aws lambda invoke --function-name ${aws_lambda_function.backup_function.function_name} /tmp/output.json"
}