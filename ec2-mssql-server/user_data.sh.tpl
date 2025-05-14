#!/bin/bash
set -xe

# --------------------------------------------
# 1. Instalar Docker
# --------------------------------------------
yum update -y
amazon-linux-extras install docker -y
systemctl start docker
systemctl enable docker
usermod -aG docker ec2-user


# Esperar a que el usuario suba Dockerfile, entrypoint.sh e init.sql
echo "Esperando archivos..."
for i in {1..10}; do
  if [[ -f /home/ec2-user/docker/Dockerfile ]]; then
    echo "Archivos detectados"
    chown ec2-user:ec2-user /home/ec2-user/docker
    break
  fi
  sleep 10
done

# --------------------------------------------
# 2. Construir imagen Docker personalizada
# --------------------------------------------
cd /home/ec2-user/docker
docker build -t custom-mssql .

# --------------------------------------------
# 3. Ejecutar contenedor con SQL Server
# --------------------------------------------
docker run -d --name mssql_container \
  -e "ACCEPT_EULA=Y" \
  -e "SA_PASSWORD=${sa_password}" \
  -e "sql_user=${sql_user}" \
  -e "sql_password=${sql_password}" \
  -p 1433:1433 \
  custom-mssql