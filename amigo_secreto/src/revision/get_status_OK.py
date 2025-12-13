# lambda_get_status.py
import json
import boto3

dynamodb = boto3.resource('dynamodb')
sessions_table = dynamodb.Table('Sessions')
assignments_table = dynamodb.Table('Assignments')

def lambda_handler(event, context):
    """
    GET /session/{sessionId}/status
    Retorna quiénes han revelado y quiénes faltan
    """
    try:
        session_id = event['pathParameters']['sessionId']
        
        # Obtener sesión
        session = sessions_table.get_item(
            Key={'PK': f'SESSION#{session_id}', 'SK': 'METADATA'}
        )
        
        if 'Item' not in session:
            return {
                'statusCode': 404,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': False, 'error': 'Sesión no encontrada'})
            }
        
        session_data = session['Item']
        participants = session_data.get('participants', [])
        
        # Obtener assignments
        response = assignments_table.query(
            KeyConditionExpression='PK = :pk',
            ExpressionAttributeValues={':pk': f'SESSION#{session_id}'}
        )
        
        assignments = response.get('Items', [])
        revealed = [a['nickname'] for a in assignments if a.get('hasRevealed')]
        pending = [p for p in participants if p not in revealed]
        
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'status': session_data.get('status'),
                'participants': participants,
                'revealed': revealed,
                'pending': pending,
                'allRevealed': len(pending) == 0
            })
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': False, 'error': str(e)})
        }