output "load_balancer_dns_name" {
  description = "URL pública del Load Balancer para acceder al API"
  value       = aws_lb.this.dns_name
}

output "ecs_task_definition_arn" {
  description = "ARN de la definición de la tarea ECS"
  value       = aws_ecs_task_definition.this.arn
}

output "ecs_cluster_name" {
  description = "Nombre del cluster ECS"
  value       = aws_ecs_cluster.this.name
}

output "ecs_service_arn" {
  description = "ARN del servicio ECS Fargate"
  value       = aws_ecs_service.this.id
}

output "subnet_ids" {
  description = "IDs de las subnets usadas por el servicio"
  value       = local.subnet_ids
}