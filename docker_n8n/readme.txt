# Iniciar n8n
docker compose up -d

# Ver logs
docker compose logs -f

# Detener
docker compose down

# Detener y eliminar volumen
docker compose down -v


http://localhost:5678

# Acceder al shell del contenedor en ejecución
docker compose exec n8n sh

# O si prefieres bash (si está disponible)
docker compose exec n8n bash

# También puedes usar docker directamente
docker exec -it n8n sh

# Ver logs en tiempo real
docker compose logs -f n8n

# Ver últimas 100 líneas
docker compose logs --tail=100 n8n

# Desde dentro del contenedor puedes usar comandos de n8n:
# Primero entrar al contenedor
docker-compose exec n8n sh

# Luego usar comandos n8n
n8n --help
n8n export:workflow --all
n8n export:credentials --all