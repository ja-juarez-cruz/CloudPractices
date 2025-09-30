# Usar imagen base de Python 3.12 compatible con AWS Lambda
FROM public.ecr.aws/lambda/python:3.12

# Instalar zip para comprimir archivos
USER root
RUN dnf install -y zip

# Crear directorio para las librerías siguiendo la estructura de AWS Lambda Layer
RUN mkdir -p /opt/python

# Copiar el archivo requirements.txt
COPY requirements.txt /tmp/requirements.txt

# Instalar las librerías desde requirements.txt en el directorio correcto
RUN pip install --no-cache-dir --target /opt/python -r /tmp/requirements.txt

# Crear el ZIP con la estructura correcta para AWS Lambda Layer
WORKDIR /opt
RUN zip -r9 python-layer.zip python/

# Comando por defecto para mantener el contenedor ejecutándose
CMD ["tail", "-f", "/dev/null"]