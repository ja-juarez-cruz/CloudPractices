# Imagen base oficial para Lambda Python 3.12
FROM public.ecr.aws/sam/build-python3.12

# Instalar herramientas necesarias del sistema
RUN dnf install -y "dnf-command(download)"
RUN dnf install -y tar
RUN dnf group install -y "Development Tools"
RUN dnf install -y freetds freetds-devel 

# Descargar y compilar unixODBC desde código fuente
WORKDIR /root
RUN dnf download --source unixODBC && \
    rpm -ivh unixODBC*.src.rpm

# Extraer código fuente
WORKDIR /root/rpmbuild/SOURCES
RUN mkdir unixODBC && \
    tar -xvf unixODBC*.tar.gz -C unixODBC --strip-components=1

# Configurar y compilar unixODBC en /opt
WORKDIR /root/rpmbuild/SOURCES/unixODBC
RUN ./configure \
    --sysconfdir=/opt \
    --disable-gui \
    --disable-drivers \
    --enable-iconv \
    --with-iconv-char-enc=UTF8 \
    --with-iconv-ucode-enc=UTF16LE \
    --prefix=/opt && \
    make && make install

# Instalar drivers ODBC de Microsoft (v17 y v18)
RUN curl -sSL https://packages.microsoft.com/config/rhel/9/prod.repo -o /etc/yum.repos.d/mssql-release.repo && \
    ACCEPT_EULA=Y dnf install -y msodbcsql17 msodbcsql18 && \
    dnf clean all

# Copiar drivers a /opt
RUN mkdir -p /opt/msodbcsql17 /opt/msodbcsql18 && \
    cp -r /opt/microsoft/msodbcsql17/* /opt/msodbcsql17/ && \
    cp -r /opt/microsoft/msodbcsql18/* /opt/msodbcsql18/ && \
    rm -rf /opt/microsoft/

# Instalar pyodbc en estructura de Lambda Layer
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt -t /opt/python

# Copiar y ejecutar script para dependencias FreeTDS
COPY copy_libtdsodbc.sh /tmp/copy_libtdsodbc.sh
RUN chmod +x /tmp/copy_libtdsodbc.sh && \
    /tmp/copy_libtdsodbc.sh

# Crear archivos de configuración ODBC
RUN cat <<EOF > /opt/odbcinst.ini
[FreeTDS]
Description=Free Sybase & MS SQL Driver
Driver=/opt/lib/libtdsodbc.so
Setup=/opt/lib/libtdsS.so
UsageCount=1

[ODBCDriver17forSQLServer]
Description=Microsoft ODBC Driver 17 for SQL Server
Driver=DUMMY17
UsageCount=1

[ODBCDriver18forSQLServer]
Description=Microsoft ODBC Driver 18 for SQL Server
Driver=DUMMY18
UsageCount=1
EOF

# Configurar rutas reales de los drivers
RUN DRIVER_PATH=$(ls -1 /opt/msodbcsql17/lib64/libmsodbcsql*.so.* | head -n1) && \
    sed -i "s|Driver=DUMMY17|Driver=$DRIVER_PATH|" /opt/odbcinst.ini

RUN DRIVER_PATH=$(ls -1 /opt/msodbcsql18/lib64/libmsodbcsql*.so.* | head -n1) && \
    sed -i "s|Driver=DUMMY18|Driver=$DRIVER_PATH|" /opt/odbcinst.ini

# Empaquetar el Layer
WORKDIR /opt
RUN zip -r /opt/layer.zip python msodbcsql17 msodbcsql18 lib lib64 odbc.ini odbcinst.ini