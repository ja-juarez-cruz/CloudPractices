#!/bin/bash

# Ruta de instalación personalizada
DEST_DIR="/opt/lib"
LIB_ORIG="/usr/lib64/libtdsodbc.so.0.0.0"  # Cambiar si es diferente
EXCLUDE_LIST="ld-linux|linux-vdso|libc.so|libdl.so|libresolv.so|libm.so|libpthread.so|librt.so|libselinux.so|libnss|libcrypt|libaudit|libcap|libsystemd|libgssapi_krb5|libkrb5|libk5crypto|libcom_err|libkrb5support|libkeyutils"

# Asegurar directorio destino
mkdir -p "$DEST_DIR"

# Copiar la librería principal
echo "Copiando $LIB_ORIG a $DEST_DIR..."
cp "$LIB_ORIG" "$DEST_DIR/"

# Crear symlinks necesarios
cd "$DEST_DIR"
REAL_BASENAME=$(basename "$LIB_ORIG")                   # libtdsodbc.so.0.0.0
SONAME=$(echo "$REAL_BASENAME" | sed 's/\.0$//')        # libtdsodbc.so.0
BASENAME=$(echo "$REAL_BASENAME" | sed 's/\.so\..*$/\.so/')  # libtdsodbc.so

ln -sf "$REAL_BASENAME" "$SONAME"
ln -sf "$SONAME" "$BASENAME"

# Detectar y copiar dependencias no críticas
echo "Analizando dependencias..."
ldd "$LIB_ORIG" | awk '{print $3}' | grep "^/" | grep -Ev "$EXCLUDE_LIST" | while read -r dep; do
    if [ -f "$dep" ]; then
        echo "Copiando dependencia: $dep"
        cp -n "$dep" "$DEST_DIR/"
        # Crear symlink básico si es .so.X
        base=$(basename "$dep")
        if [[ "$base" =~ \.so\.[0-9]+ ]]; then
            linkname=$(echo "$base" | sed -E 's/\.so\.[0-9]+/.so/')
            [[ ! -e "$DEST_DIR/$linkname" ]] && ln -sf "$base" "$DEST_DIR/$linkname"
        fi
    fi
done

# Agregar /opt/lib al cargador dinámico
echo "Registrando $DEST_DIR en ld.so.conf..."
echo "$DEST_DIR" | tee /etc/ld.so.conf.d/custom-libs.conf > /dev/null
ldconfig

echo "Librerías personalizadas preparadas en $DEST_DIR"