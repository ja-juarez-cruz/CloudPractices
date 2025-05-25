FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN mkdir -p /mnt/sqlite && \
    chmod -R 777 /mnt/sqlite

COPY app app
WORKDIR /app/app

EXPOSE 80
CMD ["python", "app.py"]
