# Región donde se desplegará la infraestructura en AWS
variable "aws_region" {
  default = "us-east-1"
}

# Dirección IP pública de tu máquina local (con /32 para acceso exclusivo)
# Sustituir por tu ip publica
variable "my_ip" {
  description = "Tu IP pública"
  type        = string
  default     = "187.190.21.102/32"
}