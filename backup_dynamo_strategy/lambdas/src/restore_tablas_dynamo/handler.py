#!/usr/bin/env python3
"""
Script de Restauración de DynamoDB desde S3
Uso: python restore_dynamodb.py --table alumnos --date 20241124
"""

import boto3
import json
import gzip
import argparse
from datetime import datetime
from typing import List, Dict, Any
import sys
from botocore.exceptions import ClientError

# Configuración
BACKUP_BUCKET = 'school-system-dynamodb-backups-prod'
BACKUP_PREFIX = 'backups'
BATCH_SIZE = 25  # DynamoDB BatchWriteItem limit


def list_available_backups(s3_client, table_name: str = None) -> List[Dict]:
    """Lista todos los backups disponibles"""
    print("\n🔍 Buscando backups disponibles...\n")
    
    prefix = f"{BACKUP_PREFIX}/"
    if table_name:
        # Buscar backups de tabla específica
        prefix = f"{BACKUP_PREFIX}/"
    
    backups = []
    paginator = s3_client.get_paginator('list_objects_v2')
    
    for page in paginator.paginate(Bucket=BACKUP_BUCKET, Prefix=prefix):
        for obj in page.get('Contents', []):
            key = obj['Key']
            if key.endswith(('.json', '.json.gz')):
                # Parsear estructura: backups/YYYY/MM/DD/table_name/backup_YYYYMMDD-HHMMSS.json
                parts = key.split('/')
                if len(parts) >= 6:
                    year, month, day, tbl_name = parts[1:5]
                    filename = parts[5]
                    
                    if table_name and tbl_name != table_name:
                        continue
                    
                    # Extraer timestamp del filename
                    timestamp = filename.replace('backup_', '').replace('.json.gz', '').replace('.json', '')
                    
                    backups.append({
                        'table': tbl_name,
                        'date': f"{year}-{month}-{day}",
                        'timestamp': timestamp,
                        's3_key': key,
                        'size': obj['Size'],
                        'last_modified': obj['LastModified']
                    })
    
    return sorted(backups, key=lambda x: x['timestamp'], reverse=True)


def download_and_decompress_backup(s3_client, s3_key: str) -> List[Dict]:
    """Descarga y descomprime backup desde S3"""
    print(f"\n📥 Descargando backup: {s3_key}")
    
    try:
        response = s3_client.get_object(Bucket=BACKUP_BUCKET, Key=s3_key)
        data = response['Body'].read()
        
        # Descomprimir si es gzip
        if s3_key.endswith('.gz'):
            print("📦 Descomprimiendo datos...")
            data = gzip.decompress(data)
        
        # Parsear JSON
        items = json.loads(data.decode('utf-8'))
        print(f"✓ {len(items):,} items cargados desde backup")
        
        return items
        
    except ClientError as e:
        print(f"✗ Error descargando backup: {e}")
        sys.exit(1)


def convert_to_dynamodb_format(items: List[Dict]) -> List[Dict]:
    """
    Convierte JSON limpio a formato DynamoDB
    Inverso de la función en lambda
    """
    def serialize_value(value):
        if value is None:
            return {'NULL': True}
        elif isinstance(value, bool):
            return {'BOOL': value}
        elif isinstance(value, int) or isinstance(value, float):
            return {'N': str(value)}
        elif isinstance(value, str):
            return {'S': value}
        elif isinstance(value, list):
            return {'L': [serialize_value(v) for v in value]}
        elif isinstance(value, dict):
            return {'M': {k: serialize_value(v) for k, v in value.items()}}
        else:
            return {'S': str(value)}
    
    def serialize_item(item):
        return {key: serialize_value(value) for key, value in item.items()}
    
    return [serialize_item(item) for item in items]


def batch_write_items(dynamodb_client, table_name: str, items: List[Dict]) -> bool:
    """
    Escribe items a DynamoDB en lotes
    Maneja automáticamente reintentos de unprocessed items
    """
    print(f"\n📝 Restaurando {len(items):,} items a tabla '{table_name}'...")
    
    total_written = 0
    total_failed = 0
    
    # Procesar en lotes de 25 (límite de BatchWriteItem)
    for i in range(0, len(items), BATCH_SIZE):
        batch = items[i:i + BATCH_SIZE]
        
        # Preparar request
        request_items = {
            table_name: [
                {'PutRequest': {'Item': item}}
                for item in batch
            ]
        }
        
        # Intentar escribir con reintentos
        max_retries = 3
        retry_count = 0
        
        while retry_count < max_retries:
            try:
                response = dynamodb_client.batch_write_item(RequestItems=request_items)
                
                # Verificar si hay items no procesados
                unprocessed = response.get('UnprocessedItems', {})
                
                if not unprocessed:
                    total_written += len(batch)
                    if (i // BATCH_SIZE + 1) % 10 == 0:
                        print(f"  Progreso: {total_written:,}/{len(items):,} items ({total_written*100//len(items)}%)")
                    break
                else:
                    # Reintentar items no procesados
                    request_items = unprocessed
                    retry_count += 1
                    print(f"  ⚠ Reintentando {len(unprocessed[table_name])} items no procesados...")
                    
            except ClientError as e:
                error_code = e.response['Error']['Code']
                if error_code == 'ProvisionedThroughputExceededException':
                    print(f"  ⚠ Throughput excedido, esperando...")
                    import time
                    time.sleep(2 ** retry_count)  # Backoff exponencial
                    retry_count += 1
                else:
                    print(f"  ✗ Error escribiendo lote: {e}")
                    total_failed += len(batch)
                    break
        
        if retry_count >= max_retries:
            print(f"  ✗ Máximo de reintentos alcanzado para lote")
            total_failed += len(batch)
    
    print(f"\n{'='*60}")
    print(f"RESULTADO DE RESTAURACIÓN")
    print(f"{'='*60}")
    print(f"✓ Escritos exitosamente: {total_written:,}")
    if total_failed > 0:
        print(f"✗ Fallidos: {total_failed:,}")
    print(f"{'='*60}\n")
    
    return total_failed == 0


def restore_table(table_name: str, backup_date: str = None, backup_timestamp: str = None, 
                 dry_run: bool = False) -> bool:
    """
    Restaura una tabla desde backup
    
    Args:
        table_name: Nombre de la tabla a restaurar
        backup_date: Fecha en formato YYYY-MM-DD (opcional)
        backup_timestamp: Timestamp exacto YYYYMMDD-HHMMSS (opcional)
        dry_run: Si es True, solo muestra lo que se haría sin ejecutar
    """
    s3_client = boto3.client('s3')
    dynamodb_client = boto3.client('dynamodb')
    
    # 1. Listar backups disponibles
    backups = list_available_backups(s3_client, table_name)
    
    if not backups:
        print(f"✗ No se encontraron backups para la tabla '{table_name}'")
        return False
    
    # 2. Seleccionar backup
    selected_backup = None
    
    if backup_timestamp:
        # Buscar por timestamp exacto
        selected_backup = next((b for b in backups if b['timestamp'] == backup_timestamp), None)
    elif backup_date:
        # Buscar el más reciente de la fecha especificada
        selected_backup = next((b for b in backups if b['date'] == backup_date), None)
    else:
        # Usar el más reciente
        selected_backup = backups[0]
    
    if not selected_backup:
        print(f"✗ No se encontró backup para los criterios especificados")
        print("\nBackups disponibles:")
        for b in backups[:5]:
            print(f"  • {b['date']} {b['timestamp']} - {b['size']:,} bytes")
        return False
    
    print(f"\n{'='*60}")
    print(f"BACKUP SELECCIONADO")
    print(f"{'='*60}")
    print(f"Tabla: {selected_backup['table']}")
    print(f"Fecha: {selected_backup['date']}")
    print(f"Timestamp: {selected_backup['timestamp']}")
    print(f"Tamaño: {selected_backup['size']:,} bytes")
    print(f"S3 Key: {selected_backup['s3_key']}")
    print(f"{'='*60}\n")
    
    if dry_run:
        print("🔍 DRY RUN: No se realizarán cambios")
        return True
    
    # Confirmar restauración
    confirm = input("⚠️  ¿Confirmar restauración? Esto REEMPLAZARÁ los datos actuales (y/n): ")
    if confirm.lower() != 'y':
        print("❌ Restauración cancelada")
        return False
    
    # 3. Descargar backup
    items = download_and_decompress_backup(s3_client, selected_backup['s3_key'])
    
    # 4. Convertir a formato DynamoDB
    print("\n🔄 Convirtiendo datos a formato DynamoDB...")
    dynamodb_items = convert_to_dynamodb_format(items)
    
    # 5. Verificar que la tabla existe
    try:
        dynamodb_client.describe_table(TableName=table_name)
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceNotFoundException':
            print(f"✗ La tabla '{table_name}' no existe. Debe ser creada primero con Terraform.")
            return False
        raise
    
    # 6. Restaurar datos
    success = batch_write_items(dynamodb_client, table_name, dynamodb_items)
    
    if success:
        print("✅ Restauración completada exitosamente!")
    else:
        print("⚠️  Restauración completada con errores")
    
    return success


def main():
    parser = argparse.ArgumentParser(
        description='Restaura tablas DynamoDB desde backups en S3',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos de uso:
  # Listar backups disponibles para una tabla
  python restore_dynamodb.py --table alumnos --list
  
  # Restaurar el backup más reciente
  python restore_dynamodb.py --table alumnos
  
  # Restaurar backup de fecha específica
  python restore_dynamodb.py --table alumnos --date 2024-11-24
  
  # Restaurar backup con timestamp exacto
  python restore_dynamodb.py --table alumnos --timestamp 20241124-020015
  
  # Simular restauración (dry-run)
  python restore_dynamodb.py --table alumnos --dry-run
        """
    )
    
    parser.add_argument('--table', required=True, help='Nombre de la tabla a restaurar')
    parser.add_argument('--date', help='Fecha del backup (YYYY-MM-DD)')
    parser.add_argument('--timestamp', help='Timestamp exacto del backup (YYYYMMDD-HHMMSS)')
    parser.add_argument('--list', action='store_true', help='Solo listar backups disponibles')
    parser.add_argument('--dry-run', action='store_true', help='Simular sin hacer cambios')
    
    args = parser.parse_args()
    
    # Solo listar backups
    if args.list:
        s3_client = boto3.client('s3')
        backups = list_available_backups(s3_client, args.table)
        
        if backups:
            print(f"\n📋 Backups disponibles para '{args.table}':\n")
            for b in backups:
                print(f"  {b['date']} {b['timestamp']} - {b['size']:,} bytes")
            print(f"\nTotal: {len(backups)} backups")
        else:
            print(f"No se encontraron backups para '{args.table}'")
        return
    
    # Restaurar
    success = restore_table(
        table_name=args.table,
        backup_date=args.date,
        backup_timestamp=args.timestamp,
        dry_run=args.dry_run
    )
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()