# lambda_reveal_friend.py
import json
import boto3
import random

dynamodb = boto3.resource('dynamodb')
assignments_table = dynamodb.Table('Assignments')
sessions_table = dynamodb.Table('Sessions')

def lambda_handler(event, context):
    """
    POST /session/{sessionId}/reveal
    Body: { "nickname": "user1" }
    Asigna amigo secreto usando algoritmo de permutación sin punto fijo
    """
    # Headers CORS
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
        'Content-Type': 'application/json'
    }
    
    # Manejar preflight OPTIONS
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'message': 'OK'})
        }
    
    try:
        session_id = event['pathParameters']['sessionId']
        body = json.loads(event['body'])
        nickname = body.get('nickname', '').strip()
        
        # Obtener sesión
        session = sessions_table.get_item(
            Key={'PK': f'SESSION#{session_id}', 'SK': 'METADATA'}
        )
        
        if 'Item' not in session:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'success': False, 'error': 'Sesión no encontrada'})
            }
        
        participants = session['Item'].get('participants', [])
        
        if nickname not in participants:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'success': False, 'error': 'Nickname no válido'})
            }
        
        # Obtener todos los assignments actuales
        response = assignments_table.query(
            KeyConditionExpression='PK = :pk',
            ExpressionAttributeValues={':pk': f'SESSION#{session_id}'}
        )
        
        assignments = response.get('Items', [])
        revealed_nicknames = [a['nickname'] for a in assignments if a.get('hasRevealed')]
        
        # Verificar si este usuario ya reveló
        if nickname in revealed_nicknames:
            return {
                'statusCode': 409,
                'headers': headers,
                'body': json.dumps({'success': False, 'error': 'Ya revelaste tu amigo secreto'})
            }
        
        # CASO 1: Es el primer participante en revelar
        if len(revealed_nicknames) == 0:
            print(f"Primera revelación. Generando sorteo completo para {len(participants)} participantes")
            
            # Generar permutación sin punto fijo (nadie se toca a sí mismo)
            complete_assignment = generate_derangement(participants)
            
            if not complete_assignment:
                return {
                    'statusCode': 500,
                    'headers': headers,
                    'body': json.dumps({'success': False, 'error': 'Error generando sorteo'})
                }
            
            # Guardar TODOS los assignments de una vez (pero solo marcar como revelado al actual)
            try:
                with assignments_table.batch_writer() as batch:
                    for giver, receiver in complete_assignment.items():
                        batch.put_item(
                            Item={
                                'PK': f'SESSION#{session_id}',
                                'SK': f'USER#{giver}',
                                'nickname': giver,
                                'assignedTo': receiver,
                                'wishlist': '',
                                'hasRevealed': giver == nickname  # Solo el actual está revelado
                            }
                        )
                
                assigned_friend = complete_assignment[nickname]
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({'success': True, 'assignedTo': assigned_friend})
                }
                
            except Exception as e:
                print(f"Error en batch write: {str(e)}")
                return {
                    'statusCode': 500,
                    'headers': headers,
                    'body': json.dumps({'success': False, 'error': 'Error guardando asignaciones'})
                }
        
        # CASO 2: Ya existe un sorteo, solo revelar al participante actual
        else:
            # Buscar la asignación pre-existente
            existing_assignment = next((a for a in assignments if a['nickname'] == nickname), None)
            
            if not existing_assignment:
                return {
                    'statusCode': 404,
                    'headers': headers,
                    'body': json.dumps({'success': False, 'error': 'No se encontró tu asignación'})
                }
            
            # Marcar como revelado
            assignments_table.update_item(
                Key={'PK': f'SESSION#{session_id}', 'SK': f'USER#{nickname}'},
                UpdateExpression='SET hasRevealed = :r',
                ExpressionAttributeValues={':r': True},
                ConditionExpression='attribute_exists(SK) AND hasRevealed = :f',
                ExpressionAttributeNames={'r': ':r', 'f': ':f'}
            )
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'success': True, 'assignedTo': existing_assignment['assignedTo']})
            }
        
    except dynamodb.meta.client.exceptions.ConditionalCheckFailedException:
        return {
            'statusCode': 409,
            'headers': headers,
            'body': json.dumps({'success': False, 'error': 'Ya revelaste tu amigo secreto'})
        }
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'success': False, 'error': str(e)})
        }


def generate_derangement(participants):
    """
    Genera una permutación donde nadie se toca a sí mismo (derangement).
    
    Algoritmo: Intentar shuffles aleatorios hasta encontrar uno válido.
    Para listas pequeñas (< 100), esto es eficiente.
    
    Args:
        participants: Lista de nicknames
        
    Returns:
        Dict {giver: receiver} donde giver != receiver para todos
    """
    if len(participants) < 2:
        return None
    
    max_attempts = 1000
    original = participants.copy()
    
    for attempt in range(max_attempts):
        shuffled = participants.copy()
        random.shuffle(shuffled)
        
        # Verificar que nadie se toque a sí mismo
        is_valid = all(original[i] != shuffled[i] for i in range(len(original)))
        
        if is_valid:
            # Crear diccionario de asignaciones
            assignment = {original[i]: shuffled[i] for i in range(len(original))}
            print(f"Sorteo generado en intento {attempt + 1}: {assignment}")
            return assignment
    
    # Si después de 1000 intentos no se logró, usar algoritmo determinístico
    print("Usando algoritmo determinístico para derangement")
    return generate_derangement_deterministic(participants)


def generate_derangement_deterministic(participants):
    """
    Algoritmo determinístico para generar derangement.
    Basado en el algoritmo de rotación simple.
    
    Para n participantes:
    - participant[i] -> participant[(i+1) % n]
    
    Esto garantiza que nadie se toque a sí mismo.
    """
    n = len(participants)
    if n < 2:
        return None
    
    assignment = {}
    for i in range(n):
        giver = participants[i]
        receiver = participants[(i + 1) % n]  # Rotación circular
        assignment[giver] = receiver
    
    print(f"Sorteo determinístico generado: {assignment}")
    return assignment



