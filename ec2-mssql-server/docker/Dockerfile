FROM mcr.microsoft.com/mssql/server:2019-latest

# Variables de entorno para usar en tiempo de ejecución
ENV ACCEPT_EULA=Y
ENV MSSQL_PID=Express

# Copiar los scripts
COPY entrypoint.sh /home/docker/entrypoint.sh
COPY init.sql /home/docker/init.sql

EXPOSE 1433

CMD ["/bin/bash", "/home/docker/entrypoint.sh"]