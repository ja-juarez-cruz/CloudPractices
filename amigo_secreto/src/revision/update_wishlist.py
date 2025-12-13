# lambda_update_wishlist.py
import json
import boto3

dynamodb = boto3.resource('dynamodb')
assignments_table = dynamodb.Table('Assignments')

def lambda_handler(event, context):
    """
    PUT /session/{sessionId}/wishlist
    Body: { "nickname": "user1", "wishlist": "..." }
    """
    try:
        session_id = event['pathParameters']['sessionId']
        body = json.loads(event['body'])
        nickname = body.get('nickname', '').strip()
        wishlist = body.get('wishlist', '')
        
        assignments_table.update_item(
            Key={'PK': f'SESSION#{session_id}', 'SK': f'USER#{nickname}'},
            UpdateExpression='SET wishlist = :w',
            ExpressionAttributeValues={':w': wishlist},
            ConditionExpression='attribute_exists(SK)'
        )
        
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': True})
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': False, 'error': str(e)})
        }