FROM public.ecr.aws/sam/build-python3.12

# --------------------------------------------
# Desactivar ENTRYPOINT por defecto para entorno Docker
# --------------------------------------------
ENTRYPOINT []

# Instalar herramientas y dependencias requeridas
RUN dnf update -y && \
    dnf install -y \
        libxml2 libxml2-devel \
        libxslt libxslt-devel \
        xmlsec1 xmlsec1-devel \
        xmlsec1-openssl \
        libtool-ltdl libtool-ltdl-devel \
        gcc gcc-c++ \
        make \
        zip unzip \
        pkgconfig && \
    dnf clean all

# Crear estructura de layer
RUN mkdir -p /opt/python /opt/lib

WORKDIR /opt/python

# Instalar librerías desde fuente para forzar compatibilidad con libxml2 local
RUN pip install --no-binary=:all: lxml xmlsec zeep -t .

# Copiar bibliotecas compartidas necesarias al Layer
RUN cp /usr/lib64/libxml2.so* /opt/lib/ && \
    cp /usr/lib64/libxslt.so* /opt/lib/ && \
    cp /usr/lib64/libexslt.so* /opt/lib/ && \
    cp /usr/lib64/libxmlsec1*.so* /opt/lib/ && \
    cp /usr/lib64/libltdl.so.7 /opt/lib/ && \
    cp /usr/lib64/libxmlsec1-openssl.so* /opt/lib/ && \
    chmod 755 /opt/lib/*

COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt -t /opt/python

# --------------------------------------------
# Empaquetar el layer listo para Lambda
# --------------------------------------------
WORKDIR /opt
RUN zip -r layer.zip python lib
