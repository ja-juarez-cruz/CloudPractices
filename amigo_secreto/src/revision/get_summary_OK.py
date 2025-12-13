# lambda_get_summary.py
import json
import boto3

dynamodb = boto3.resource('dynamodb')
sessions_table = dynamodb.Table('Sessions')
assignments_table = dynamodb.Table('Assignments')

def lambda_handler(event, context):
    """
    GET /session/{sessionId}/summary
    Solo disponible cuando todos han revelado
    Retorna todos los participantes y sus wishlists
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
        
        participants = session['Item'].get('participants', [])
        
        # Obtener todos los assignments
        response = assignments_table.query(
            KeyConditionExpression='PK = :pk',
            ExpressionAttributeValues={':pk': f'SESSION#{session_id}'}
        )
        
        assignments = response.get('Items', [])
        
        # Verificar que todos hayan revelado
        if len([a for a in assignments if a.get('hasRevealed')]) != len(participants):
            return {
                'statusCode': 403,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': False, 'error': 'Aún hay participantes pendientes'})
            }
        
        # Crear resumen
        summary = []
        for participant in participants:
            assignment = next((a for a in assignments if a['nickname'] == participant), None)
            summary.append({
                'nickname': participant,
                'wishlist': assignment.get('wishlist', 'Sin wishlist') if assignment else 'Sin wishlist'
            })
        
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': True, 'summary': summary})
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': False, 'error': str(e)})
        }