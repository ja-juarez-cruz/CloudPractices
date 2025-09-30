sudo docker build -t lambda-layer-builder .

sudo docker run -d --name layer-container lambda-layer-builder

sudo docker cp layer-container:/opt/python-layer.zip ./python-layer.zip


# Detener y eliminar el contenedor
sudo docker stop layer-container
sudo docker rm layer-container

# Eliminar la imagen (opcional)
sudo docker rmi lambda-layer-builder