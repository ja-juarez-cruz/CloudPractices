# lambda_create_session.py
import json
import boto3
import random
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
sessions_table = dynamodb.Table('Sessions')

def lambda_handler(event, context):
    """
    POST /session/create
    Genera un ID de sesión único de 10 dígitos
    """
    try:
        # Generar sessionId único
        session_id = str(random.randint(1000000000, 9999999999))
        
        # Verificar que no exista (muy improbable pero seguro)
        response = sessions_table.get_item(Key={'PK': f'SESSION#{session_id}', 'SK': 'METADATA'})
        
        if 'Item' in response:
            # Si existe, generar otro
            session_id = str(random.randint(1000000000, 9999999999))
        
        # Crear sesión
        sessions_table.put_item(
            Item={
                'PK': f'SESSION#{session_id}',
                'SK': 'METADATA',
                'sessionId': session_id,
                'createdAt': datetime.utcnow().isoformat(),
                'status': 'SETUP',
                'participants': [],
                'TTL': int(datetime.utcnow().timestamp()) + (30 * 24 * 60 * 60)  # 30 días
            }
        )
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({'sessionId': session_id})
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Error creando sesión'})
        }