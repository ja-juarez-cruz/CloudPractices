# --------------------------------------------
# Proveedor de AWS en la región especificada
# Se usa el profile "terraform" de AWS CLI, creado con aws configure
# --------------------------------------------
provider "aws" {
  region = var.aws_region
  profile = "terraform"
}

# --------------------------------------------
# Obtener AMI oficial de Amazon Linux 2
# (más reciente, mantenida por Amazon)
# --------------------------------------------
data "aws_ami" "amazon_linux2" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

# --------------------------------------------
# Leer VPC por defecto (para simplificar)
# Puedes cambiar esto a una VPC específica
# --------------------------------------------
data "aws_vpc" "default" {
  default = true
}

# --------------------------------------------
# Crear clave SSH para conectarte a la instancia EC2
# Usa tu llave pública local (~/.ssh/id_rsa.pub)
# linea de comando para crearla: ssh-keygen -t rsa -b 4096 -C "ec2-user@aws" -f ~/.ssh/key_ec2_mssqlserver
# --------------------------------------------
resource "aws_key_pair" "deployer" {
  key_name   = "docker-key"
  public_key = file("~/.ssh/key_ec2_mssqlserver.pub")
}

# --------------------------------------------
# Crear Security Group para permitir acceso
# al puerto 1433 (SQL Server) desde tu IP
# --------------------------------------------
resource "aws_security_group" "mssql_sg" {
  name        = "mssql-sg"
  description = "Permite acceso al SQL Server en el puerto 1433"
  vpc_id      = data.aws_vpc.default.id

  # Permiter conexiones por el puerto 1433 
  # Desde desde cualquier IP
  ingress {
    description = "Acceso a base de datos MSSQL desde cualquier IP"
    from_port   = 1433
    to_port     = 1433
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Desde tu IP local mediante SSH
  ingress {
    description = "Acceso SSH desde maquina local"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.my_ip]
  }  
  
  # Permitir todo el tráfico de salida
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "mssql-sg"
  }
}

# --------------------------------------------
# Lanzar instancia EC2 con Amazon Linux 2
# Instalar Docker y correr contenedor MSSQL
# --------------------------------------------
resource "aws_instance" "mssql_server" {
  ami                         = data.aws_ami.amazon_linux2.id
  instance_type               = "t3.medium"                         # Mínimo 2GB RAM para MSSQL
  key_name                    = aws_key_pair.deployer.key_name
  vpc_security_group_ids      = [aws_security_group.mssql_sg.id]
  associate_public_ip_address = true                                # Necesario para acceder por IP pública

  # Script de inicialización de EC2 (instala Docker, construye imagen, corre contenedor)
  user_data = templatefile("${path.module}/user_data.sh.tpl", {
    sql_user     = "user1"
    sql_password = "Welcome2025!"
    sa_password  = "SecureWelcome2025!"
  })

  tags = {
    Name = "mssql-server-docker"
  }

  provisioner "local-exec" {
    command = <<EOT
      echo "Esperando a que EC2 esté lista..."
      sleep 50

      echo "Subiendo archivos vía SCP..."
      scp -o StrictHostKeyChecking=no -i ~/.ssh/key_ec2_mssqlserver \
        -r ./docker/ \
        ec2-user@${self.public_ip}:/home/ec2-user/
    EOT
  }

  depends_on = [aws_key_pair.deployer]
}