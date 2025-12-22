# Región donde se desplegará la infraestructura en AWS
variable "aws_region" {
  default = "us-east-1"
}

variable "jwt_secret" {
  default = "TJw9FAgTyf8D0XEFeJRSgQeuBKFt8UpTDQaCLK5ZoX0="
}

variable "jwt_refresh_secret" {
  default = "Q1pEfyOgpMYEmwxeOQu+1k/eX+FZCnms2ZS5T/Z2Oh"
}

variable "app_url" {
  default = "http://localhost:3000"
}

variable "environment" {
  default = "dev"
}