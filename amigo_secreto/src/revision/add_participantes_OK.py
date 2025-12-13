# lambda_add_participants.py
import json
import boto3

dynamodb = boto3.resource('dynamodb')
sessions_table = dynamodb.Table('Sessions')

def lambda_handler(event, context):
    """
    POST /session/{sessionId}/participants
    Body: { "participants": ["nick1", "nick2", ...] }
    """
    try:
        session_id = event['pathParameters']['sessionId']
        body = json.loads(event['body'])
        participants = body.get('participants', [])
        
        if not participants or len(participants) < 2:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Se necesitan al menos 2 participantes'})
            }
        
        # Validar que no haya duplicados
        if len(participants) != len(set(participants)):
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'No puede haber nicknames duplicados'})
            }
        
        # Actualizar sesión
        sessions_table.update_item(
            Key={'PK': f'SESSION#{session_id}', 'SK': 'METADATA'},
            UpdateExpression='SET participants = :p',
            ExpressionAttributeValues={':p': participants},
            ConditionExpression='attribute_exists(PK)'
        )
        
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': True})
        }
        
    except dynamodb.meta.client.exceptions.ConditionalCheckFailedException:
        return {
            'statusCode': 404,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Sesión no encontrada'})
        }
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }