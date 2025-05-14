# Imagen base con Python 3.12 y pip preinstalados
FROM python:3.12-slim

# Instalar herramientas necesarias
RUN apt-get update && \
    apt-get install -y \
        gcc \
        make \
        unzip \
        libaio1 \
        libffi-dev \
        libssl-dev \
        p7zip-full && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Crear carpeta para dependencias de Python
RUN mkdir -p /opt/python
WORKDIR /opt/python

# Copiar archivo de dependencias
COPY requirements.txt .

# Instalar dependencias de Python en /opt/python
RUN pip install --no-cache-dir -r requirements.txt -t .

# Copiar Oracle Instant Client ZIP desde el contexto
COPY instantclient-basiclite-linuxx64.zip /opt/

# Descomprimir en /opt/oracle y limpiar
RUN mkdir -p /opt/oracle && \
    unzip /opt/instantclient-basiclite-linuxx64.zip -d /opt/oracle && \
    rm /opt/instantclient-basiclite-linuxx64.zip

# Copiar libaio a la carpeta del cliente Oracle y dar permisos
RUN cp /usr/lib/x86_64-linux-gnu/libaio.so.1 /opt/oracle/instantclient_23_7 && \
    chmod 555 /opt/oracle/instantclient_23_7/libaio.so.1

# Comprimir todo en un archivo .zip con el comando 7z
WORKDIR /opt
RUN 7z a /opt/layer.zip python oracle