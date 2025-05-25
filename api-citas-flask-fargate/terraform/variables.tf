variable "region" {
  default = "us-east-1"
}

variable "ecr_image" {
  description = "Imagen de Docker subida a ECR"
  type        = string
}
