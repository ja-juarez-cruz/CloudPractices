"""
Lambda Function: DynamoDB Backup to S3
Estrategia escalable con soporte para tablas grandes y retry automático
"""

import boto3
import json
import gzip
from datetime import datetime
from typing import List, Dict, Any
import os
from botocore.exceptions import ClientError

# Configuración desde variables de entorno
BACKUP_BUCKET = os.environ.get('BACKUP_BUCKET', 'dynamodb-backups-prod')
BACKUP_PREFIX = os.environ.get('BACKUP_PREFIX', 'backups')
COMPRESSION_ENABLED = os.environ.get('COMPRESSION_ENABLED', 'true').lower() == 'true'
REGION = os.environ.get('AWS_REGION_ID', 'us-east-1')

# Lista de tablas - configuración centralizada
TABLES_TO_BACKUP = [
    'alumnos',
    'asistencias',
    'asistencias_materias',
    'calificaciones',
    'conceptos_evaluacion',
    'escuelas',
    'grados',
    'maestros',
    'materias',
    'periodos_escolares',
    'prefectos',
    'settings',
    'staff',
    'tutores',
    'usuarios'
]

# Clientes AWS
dynamodb = boto3.client('dynamodb', region_name=REGION)
s3 = boto3.client('s3', region_name=REGION)
cloudwatch = boto3.client('cloudwatch', region_name=REGION)


class BackupMetrics:
    """Clase para tracking de métricas"""
    def __init__(self):
        self.successful_backups = 0
        self.failed_backups = 0
        self.total_items = 0
        self.total_size_bytes = 0
        self.table_metrics = {}


def get_table_count(table_name: str) -> int:
    """Obtiene el conteo aproximado de items en la tabla"""
    try:
        response = dynamodb.describe_table(TableName=table_name)
        return response['Table']['ItemCount']
    except ClientError as e:
        print(f"Error obteniendo conteo de {table_name}: {e}")
        return 0


def scan_table_with_pagination(table_name: str) -> List[Dict[str, Any]]:
    """
    Escanea tabla completa con paginación automática.
    Maneja tablas de cualquier tamaño.
    """
    items = []
    scan_kwargs = {
        'TableName': table_name,
        'ConsistentRead': False  # Lectura eventual para mejor performance
    }
    
    try:
        print(f"Iniciando scan de tabla: {table_name}")
        page_count = 0
        
        while True:
            response = dynamodb.scan(**scan_kwargs)
            items.extend(response.get('Items', []))
            page_count += 1
            
            # Log de progreso cada 5 páginas
            if page_count % 5 == 0:
                print(f"  {table_name}: {len(items)} items escaneados...")
            
            # Verificar si hay más páginas
            if 'LastEvaluatedKey' not in response:
                break
                
            scan_kwargs['ExclusiveStartKey'] = response['LastEvaluatedKey']
        
        print(f"✓ Scan completo de {table_name}: {len(items)} items totales")
        return items
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        print(f"✗ Error escaneando {table_name}: {error_code} - {e}")
        
        # Enviar métrica de error
        send_error_metric(table_name, error_code)
        raise


def convert_dynamodb_to_json(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Convierte formato DynamoDB a JSON limpio.
    Ejemplo: {'S': 'valor'} -> 'valor'
    """
    def deserialize_item(item):
        result = {}
        for key, value in item.items():
            if 'S' in value:
                result[key] = value['S']
            elif 'N' in value:
                result[key] = float(value['N']) if '.' in value['N'] else int(value['N'])
            elif 'BOOL' in value:
                result[key] = value['BOOL']
            elif 'NULL' in value:
                result[key] = None
            elif 'M' in value:
                result[key] = deserialize_item(value['M'])
            elif 'L' in value:
                result[key] = [deserialize_item({'item': i})['item'] for i in value['L']]
            elif 'SS' in value:
                result[key] = value['SS']
            elif 'NS' in value:
                result[key] = [float(n) if '.' in n else int(n) for n in value['NS']]
            else:
                result[key] = value
        return result
    
    return [deserialize_item(item) for item in items]


def compress_data(data: str) -> bytes:
    """Comprime datos usando gzip"""
    return gzip.compress(data.encode('utf-8'))


def upload_to_s3(table_name: str, data: List[Dict], timestamp: str, metrics: BackupMetrics) -> bool:
    """
    Sube backup a S3 con estructura organizada por fecha
    Estructura: s3://bucket/backups/YYYY/MM/DD/table_name/backup_HHMMSS.json[.gz]
    """
    try:
        # Preparar datos
        json_data = json.dumps(data, indent=2, ensure_ascii=False, default=str)
        data_size = len(json_data.encode('utf-8'))
        
        # Estructura de carpetas por fecha
        date_obj = datetime.strptime(timestamp, '%Y%m%d-%H%M%S')
        s3_key = (
            f"{BACKUP_PREFIX}/"
            f"{date_obj.year}/"
            f"{date_obj.month:02d}/"
            f"{date_obj.day:02d}/"
            f"{table_name}/"
            f"backup_{timestamp}"
        )
        
        # Comprimir si está habilitado
        if COMPRESSION_ENABLED:
            body = compress_data(json_data)
            s3_key += '.json.gz'
            content_type = 'application/gzip'
            compression_ratio = (1 - len(body) / data_size) * 100
            print(f"  Compresión: {data_size:,} -> {len(body):,} bytes ({compression_ratio:.1f}% reducción)")
        else:
            body = json_data.encode('utf-8')
            s3_key += '.json'
            content_type = 'application/json'
        
        # Metadata del backup
        metadata = {
            'table_name': table_name,
            'backup_timestamp': timestamp,
            'item_count': str(len(data)),
            'original_size_bytes': str(data_size),
            'compressed': str(COMPRESSION_ENABLED)
        }
        
        # Upload a S3
        s3.put_object(
            Bucket=BACKUP_BUCKET,
            Key=s3_key,
            Body=body,
            ContentType=content_type,
            Metadata=metadata,
            ServerSideEncryption='AES256',
            StorageClass='STANDARD_IA'  # Infrequent Access para ahorrar costos
        )
        
        # Actualizar métricas
        metrics.table_metrics[table_name] = {
            'items': len(data),
            'size_bytes': len(body),
            's3_key': s3_key
        }
        
        print(f"✓ Backup subido: s3://{BACKUP_BUCKET}/{s3_key}")
        return True
        
    except ClientError as e:
        print(f"✗ Error subiendo a S3 para {table_name}: {e}")
        send_error_metric(table_name, 'S3UploadError')
        return False


def backup_table(table_name: str, timestamp: str, metrics: BackupMetrics) -> Dict[str, Any]:
    """
    Función principal de backup para una tabla individual
    """
    print(f"\n{'='*60}")
    print(f"Procesando tabla: {table_name}")
    print(f"{'='*60}")
    
    start_time = datetime.now()
    result = {
        'table_name': table_name,
        'success': False,
        'items_backed_up': 0,
        'error': None
    }
    
    try:
        # 1. Obtener conteo estimado
        estimated_count = get_table_count(table_name)
        print(f"Items estimados: {estimated_count:,}")
        
        # 2. Escanear tabla
        items = scan_table_with_pagination(table_name)
        
        if not items:
            print(f"⚠ Tabla {table_name} está vacía, se creará backup vacío")
        
        # 3. Convertir a JSON limpio
        json_items = convert_dynamodb_to_json(items)
        
        # 4. Subir a S3
        upload_success = upload_to_s3(table_name, json_items, timestamp, metrics)
        
        if upload_success:
            result['success'] = True
            result['items_backed_up'] = len(items)
            metrics.successful_backups += 1
            metrics.total_items += len(items)
            
            elapsed = (datetime.now() - start_time).total_seconds()
            print(f"✓ Backup completado en {elapsed:.2f}s")
        else:
            metrics.failed_backups += 1
            result['error'] = 'Upload to S3 failed'
            
    except Exception as e:
        print(f"✗ Error procesando {table_name}: {str(e)}")
        result['error'] = str(e)
        metrics.failed_backups += 1
    
    return result


def send_cloudwatch_metrics(metrics: BackupMetrics, duration: float):
    """Envía métricas a CloudWatch para monitoreo"""
    try:
        cloudwatch.put_metric_data(
            Namespace='DynamoDBBackup',
            MetricData=[
                {
                    'MetricName': 'SuccessfulBackups',
                    'Value': metrics.successful_backups,
                    'Unit': 'Count'
                },
                {
                    'MetricName': 'FailedBackups',
                    'Value': metrics.failed_backups,
                    'Unit': 'Count'
                },
                {
                    'MetricName': 'TotalItemsBackedUp',
                    'Value': metrics.total_items,
                    'Unit': 'Count'
                },
                {
                    'MetricName': 'BackupDuration',
                    'Value': duration,
                    'Unit': 'Seconds'
                }
            ]
        )
        print("\n✓ Métricas enviadas a CloudWatch")
    except Exception as e:
        print(f"⚠ Error enviando métricas: {e}")


def send_error_metric(table_name: str, error_type: str):
    """Envía métrica de error específica"""
    try:
        cloudwatch.put_metric_data(
            Namespace='DynamoDBBackup',
            MetricData=[
                {
                    'MetricName': 'BackupError',
                    'Value': 1,
                    'Unit': 'Count',
                    'Dimensions': [
                        {'Name': 'TableName', 'Value': table_name},
                        {'Name': 'ErrorType', 'Value': error_type}
                    ]
                }
            ]
        )
    except:
        pass  # No fallar si CloudWatch falla


def lambda_handler(event, context):
    """
    Handler principal de Lambda
    Puede ser invocado por EventBridge o manualmente
    """
    print(f"\n{'#'*60}")
    print(f"# INICIO DE BACKUP AUTOMATIZADO - DynamoDB")
    print(f"# Timestamp: {datetime.now().isoformat()}")
    print(f"# Bucket: s3://{BACKUP_BUCKET}")
    print(f"# Compresión: {'Habilitada' if COMPRESSION_ENABLED else 'Deshabilitada'}")
    print(f"{'#'*60}\n")
    
    start_time = datetime.now()
    timestamp = start_time.strftime('%Y%m%d-%H%M%S')
    metrics = BackupMetrics()
    
    # Permitir override de tablas desde evento
    tables_to_process = event.get('tables', TABLES_TO_BACKUP)
    print(f"Tablas a respaldar: {len(tables_to_process)}")
    
    # Procesar cada tabla
    results = []
    for table_name in tables_to_process:
        result = backup_table(table_name, timestamp, metrics)
        results.append(result)
    
    # Calcular duración total
    duration = (datetime.now() - start_time).total_seconds()
    
    # Enviar métricas a CloudWatch
    send_cloudwatch_metrics(metrics, duration)
    
    # Resumen final
    print(f"\n{'='*60}")
    print(f"RESUMEN DEL BACKUP")
    print(f"{'='*60}")
    print(f"✓ Exitosos: {metrics.successful_backups}/{len(tables_to_process)}")
    print(f"✗ Fallidos: {metrics.failed_backups}/{len(tables_to_process)}")
    print(f"📊 Total items: {metrics.total_items:,}")
    print(f"⏱ Duración: {duration:.2f}s ({duration/60:.1f} min)")
    print(f"📍 Ubicación: s3://{BACKUP_BUCKET}/{BACKUP_PREFIX}/")
    
    if metrics.table_metrics:
        print(f"\nDetalle por tabla:")
        for table, data in metrics.table_metrics.items():
            print(f"  • {table}: {data['items']:,} items, {data['size_bytes']:,} bytes")
    
    # Determinar éxito general
    success = metrics.failed_backups == 0
    
    return {
        'statusCode': 200 if success else 500,
        'body': json.dumps({
            'success': success,
            'timestamp': timestamp,
            'tables_processed': len(tables_to_process),
            'successful_backups': metrics.successful_backups,
            'failed_backups': metrics.failed_backups,
            'total_items': metrics.total_items,
            'duration_seconds': duration,
            'results': results
        }, indent=2)
    }