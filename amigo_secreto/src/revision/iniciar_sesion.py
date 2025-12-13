# lambda_start_session.py
import json
import boto3
import os

dynamodb = boto3.resource('dynamodb')
sessions_table = dynamodb.Table('Sessions')

def lambda_handler(event, context):
    """
    POST /session/{sessionId}/start
    Cambia el status a ACTIVE y retorna URL
    """
    try:
        session_id = event['pathParameters']['sessionId']
        cloudfront_domain = os.environ.get('CLOUDFRONT_DOMAIN', 'https://your-domain.com')
        
        # Actualizar status
        sessions_table.update_item(
            Key={'PK': f'SESSION#{session_id}', 'SK': 'METADATA'},
            UpdateExpression='SET #status = :s',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={':s': 'ACTIVE'},
            ConditionExpression='attribute_exists(PK)'
        )
        
        share_url = f"{cloudfront_domain}#/session/{session_id}"
        
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'url': share_url})
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }