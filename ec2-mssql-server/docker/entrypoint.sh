#!/bin/bash
# Arrancar SQL Server en segundo plano
/opt/mssql/bin/sqlservr &

echo "Esperando que SQL Server esté listo..."
sleep 20

# Reemplazar valores en el script SQL antes de ejecutar
sed -e "s|{{SQL_USER}}|$sql_user|g" -e "s|{{SQL_PASSWORD}}|$sql_password|g" /home/docker/init.sql > /tmp/init-final.sql

# Ejecutar el script
/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P $SA_PASSWORD -i /tmp/init-final.sql -N -C

# Mantener el contenedor vivo
wait