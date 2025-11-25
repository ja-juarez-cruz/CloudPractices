# Región donde se desplegará la infraestructura en AWS
variable "aws_region" {
  default = "mx-central-1"
}

# =========================================
# VARIABLES DE CONFIGURACIÓN
# =========================================

variable "project_name" {
  description = "Nombre del proyecto"
  type        = string
}

variable "environment" {
  description = "Ambiente (dev, staging, prod)"
  type        = string
}

variable "backup_retention_days" {
  description = "Días de retención de backups"
  type        = number
  default     = 30
}

variable "backup_schedule" {
  description = "Expresión cron para backup (L-V a las 2 AM)"
  type        = string
  default     = "cron(0 2 ? * MON-FRI *)"
}

variable "enable_compression" {
  description = "Habilitar compresión gzip"
  type        = bool
  default     = true
}

variable "alert_email" {
  description = "Email para notificaciones de errores"
  type        = string
  default     = ""
}
