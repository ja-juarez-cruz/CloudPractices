import json
import boto3
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key, Attr
import json
import datetime
import abc
import uuid
from decimal import Decimal
import random

#custom error
from exception.custom_http_exception import CustomError



# Inicializa el cliente de DynamoDB
dynamodb = boto3.resource('dynamodb')
#table = dynamodb.Table('alumnos')

def replace_decimal(obj):
    if isinstance(obj, list):
        return [replace_decimal(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: replace_decimal(v) for k, v in obj.items()}
    elif isinstance(obj, Decimal):
        # Si no tiene decimales, convertir a int
        if obj % 1 == 0:
            return int(obj)
        return float(obj)
    else:
        return obj

def mapear_respuesta_dynamo(response):
    """
    Mapea la respuesta de DynamoDB a un formato estructurado
    
    Args:
        response (dict): Respuesta cruda de DynamoDB
    
    Returns:
        dict: Respuesta mapeada con metadatos y items procesados
    """
    items = response.get('Items', [])
    
    # Procesar cada item si es necesario (convertir tipos de datos DynamoDB)
    items_procesados = []
    for item in items:
        item_procesado = {}
        for key, value in item.items():
            # Convertir tipos de datos DynamoDB a Python nativo
            if isinstance(value, dict):
                if 'S' in value:  # String
                    item_procesado[key] = value['S']
                elif 'N' in value:  # Number
                    try:
                        item_procesado[key] = float(value['N']) if '.' in value['N'] else int(value['N'])
                    except ValueError:
                        item_procesado[key] = value['N']
                elif 'BOOL' in value:  # Boolean
                    item_procesado[key] = value['BOOL']
                else:
                    item_procesado[key] = value
            else:
                item_procesado[key] = value
        items_procesados.append(item_procesado)
    
    # Construir respuesta estructurada
    resultado = {
        'items': items_procesados,
        'count': len(items),
        'scannedCount': response.get('ScannedCount', 0),
        'lastEvaluatedKey': response.get('LastEvaluatedKey'),
        'hasMore': 'LastEvaluatedKey' in response
    }
    print(f"resultados: {resultado}")
    
    return resultado

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            # Convertir Decimal a int si es número entero, sino a float
            return int(obj) if obj % 1 == 0 else float(obj)
        return super(DecimalEncoder, self).default(obj)

class Client(metaclass=abc.ABCMeta):

    @abc.abstractmethod
    def addParticipantes(self,event:dict)->dict:
        pass
    
    @abc.abstractmethod
    def getStatus(self,event:dict)->dict:
        pass
    
    @abc.abstractmethod
    def claimNickname(self,event:dict)->dict:
        pass
    
    
class DynamoClient(Client):
    def __init__(self,table_name:str):
        self.table = dynamodb.Table(table_name)

    def addParticipantes(self,event:dict)->dict:
        """
        POST /amigo-secreto/session/{sessionId}/participants
        Body: { "participants": ["nick1", "nick2", ...] }
        """
        try:
            session_id = event['pathParameters']['id']
            body = json.loads(event['body'])
            participants = body.get('participants', [])
            config = body.get('config', {})  
            
            if not participants or len(participants) < 2:
                raise CustomError('Se necesitan al menos 2 participantes',"400",400)
                            
            # Validar que no haya duplicados
            if len(participants) != len(set(participants)):
                raise CustomError('No puede haber nicknames duplicados',"400",400)
            
            self.table.put_item(
                Item={
                    'id': session_id,
                    'participants': participants,
                    'createdAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    'status': 'SETUP',
                    'config': config,
                    'TTL': int(datetime.datetime.now(datetime.timezone.utc).timestamp()) + (30 * 24 * 60 * 60)  # 30 días
                }
            )            
            
            
            return {
                'statusCode': 200,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST"
                },
                'body': json.dumps({'success': True})
            }
            
        except dynamodb.meta.client.exceptions.ConditionalCheckFailedException:
            raise CustomError('Sesión no encontrada','400',400)
            
        except Exception as e:
            print(f"Error: {str(e)}")
            raise CustomError(str(e),'400',400)
            
    def getStatus(self,event:dict)->dict:
        """
        GET /amigo-secreto/session/{sessionId}/status
        Retorna quiénes han revelado y quiénes faltan
        """
        
        try:
            session_id = event['pathParameters']['id']
            
            # Obtener datos de session
            
            session_data = self.table.get_item(
                Key={
                    'id': session_id
                }
            )
            print(f'session_data: {session_data}')
            session_data = session_data.get('Item',{})
            participants = session_data.get('participants', [])
            config = session_data.get('config', {})
            print(f'participants: {participants}')
            
            # Obtener assignments
            tableAssigments = dynamodb.Table('amigo_secreto')
            assignments = tableAssigments.query(
                KeyConditionExpression='id = :id',
                ExpressionAttributeValues={':id': session_id}
            )
            assignments = assignments.get('Items', [])
            print(f'assignments: {assignments}')
            
            
            revealed = [a['nickname'] for a in assignments if a.get('hasRevealed')]
            pending = [p for p in participants if p not in revealed]
            
            # Extraer avatares
            avatars = {a['nickname']: a.get('avatar', '🎁') for a in assignments}  # ← NUEVO
            
            if len(pending) > 0:
                estado = 'ACTIVE'
            else:
                estado = 'SETUP'
            
            return {
                'statusCode': 200,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,GET"
                },
                'body': json.dumps({
                    'success': True,
                    'status': estado,
                    'participants': participants,
                    'revealed': revealed,
                    'pending': pending,
                    'allRevealed': len(pending) == 0,
                    'config': config,
                    'avatars': avatars
                })
            }
            
        except Exception as e:
            print(f"Error: {str(e)}")
            raise CustomError(str(e),'400',400)
            
    def claimNickname(self,event:dict)->dict:
        
        """
        POST /session/{sessionId}/claim
        Body: { "nickname": "user1" }
        Marca nickname como reclamado usando conditional write
        """
        try:
            session_id = event['pathParameters']['id']
            body = json.loads(event['body'])
            nickname = body.get('nickname', '').strip()
            avatar = body.get('avatar', '🎁')
            current_time = datetime.datetime.now(datetime.timezone.utc).isoformat()
            
            if not nickname:
                raise CustomError('Nickname requerido','400',400)
            
            # Verificar que el nickname esté en la lista de participantes
            session = self.table.get_item(
                Key={'id': session_id}
            )
            
            if 'Item' not in session:
                raise CustomError('Sesión no encontrada','400',400)
            
            if nickname not in session['Item'].get('participants', []):
                raise CustomError('Nickname no válido','400',400)
          
            # Intentar crear registro con conditional write (previene race conditions)
            tableAssigments = dynamodb.Table('amigo_secreto')
            
            response = tableAssigments.query(
                KeyConditionExpression=Key('id').eq(session_id)
            )

            items = response.get("Items", [])
            
            # ---------------------------------------------------------
            # CASO A: PRIMER PARTICIPANTE EN RECLAMAR (no hay items)
            # ---------------------------------------------------------
            if len(items) == 0:
                print(f"Primer nickname reclamado en esta sesión: {nickname}")

                tableAssigments.put_item(
                    Item={
                        'id': session_id,
                        'nickname': nickname,
                        'avatar': avatar,
                        'claimed': True,
                        'claimedAt': current_time,
                        'wishlist': [],
                        'hasRevealed': False
                    }
                )

                return {
                            'statusCode': 200,
                            "headers": {
                                "Access-Control-Allow-Origin": "*",
                                "Access-Control-Allow-Headers": "*",
                                "Access-Control-Allow-Methods": "OPTIONS,POST"
                            },
                            'body': json.dumps({'success': True})
                        }

            # ---------------------------------------------------------
            # CASO B: YA HAY REGISTROS → solo actualizar
            # ---------------------------------------------------------
            print(f"Actualizando nickname existente: {nickname}")

            
            tableAssigments.update_item(
                Key={
                    'id': session_id,
                    'nickname': nickname
                },
                UpdateExpression=(
                    'SET claimed = :c, '
                    'claimedAt = :claimedAt, '
                    'avatar = :avatar, '
                    'wishlist = :wishlist'
                ),                
                ExpressionAttributeValues={
                    ':c': True,
                    ':claimedAt': current_time,
                    ':avatar': avatar,         
                    ':wishlist': [],     
                },
                ConditionExpression=Attr('claimed').eq(False)  # Solo si NO estaba reclamado
            )
            return {
                'statusCode': 200,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,POST"
                },
                'body': json.dumps({'success': True})
            }
            
            
        except dynamodb.meta.client.exceptions.ConditionalCheckFailedException:
            raise CustomError('Nickname ya reclamado','400',400)
        
        except Exception as e:
            print(f"Error: {str(e)}")
            raise CustomError(str(e),'400',400)
            
    def revealFriend(self,event):
        """
        POST /session/{sessionId}/reveal
        Body: { "nickname": "user1" }
        Asigna amigo secreto usando algoritmo de permutación sin punto fijo
        """        
      
        try:
            session_id = event['pathParameters']['id']
            body = json.loads(event['body'])
            nickname = body.get('nickname', '').strip()
            
            headers = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
                'Content-Type': 'application/json'
            }
            current_time = datetime.datetime.now(datetime.timezone.utc).isoformat()
            
            # Obtener sesión
            session = self.table.get_item(
                Key={'id': session_id}
            )
            
            if 'Item' not in session:
                raise CustomError('Sesión no encontrada','400',400)
            
            participants = session['Item'].get('participants', [])
            print(f'participantes:  {participants}')
            
            if nickname not in participants:
                raise CustomError('Nickname no válido','400',400)
            
            # Obtener todos los assignments actuales
            tableAssigments = dynamodb.Table('amigo_secreto')
            response = tableAssigments.query(
                KeyConditionExpression='id = :id',
                ExpressionAttributeValues={':id': session_id}
            )
            
            assignments = response.get('Items', [])
            print(f'nicknames assignments: {assignments}')
            revealed_nicknames = [a['nickname'] for a in assignments if a.get('hasRevealed')]
            print(f'reveled_nickname: {revealed_nicknames}')
            
            # Verificar si este usuario ya reveló
            if nickname in revealed_nicknames:
                raise CustomError('Ya revelaste tu amigo secreto','400',400)
            
            # CASO 1: Es el primer participante en revelar
            if len(revealed_nicknames) == 0:
                print(f"Primera revelación. Generando sorteo completo para {len(participants)} participantes")
                
                # Generar permutación sin punto fijo (nadie se toca a sí mismo)
                complete_assignment = self.generate_derangement(participants)
                
                if not complete_assignment:
                    raise CustomError('Error generando sorteo','400',400)
                    
                
                # Guardar TODOS los assignments de una vez (pero solo marcar como revelado al actual)
                try:
                    with tableAssigments.batch_writer() as batch:
                        for giver, receiver in complete_assignment.items():
                            # Obtener avatar si existe
                            existing = next((a for a in assignments if a['nickname'] == giver), None)
                            avatar = existing.get('avatar', '🎁') if existing else '🎁'
                            batch.put_item(
                                Item={
                                    'id': session_id,
                                    'nickname': giver,
                                    'avatar': avatar,
                                    'assignedTo': receiver,
                                    'wishlist': [],
                                    'claimed': giver == nickname,
                                    'hasRevealed': giver == nickname,
                                    'revealedAt': current_time if giver == nickname else None  # ← NUEVO: Timestamp
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
                    raise CustomError(str(e),'400',400)
            
            # CASO 2: Ya existe un sorteo, solo revelar al participante actual
            else:
                # Buscar la asignación pre-existente
                existing_assignment = next((a for a in assignments if a['nickname'] == nickname), None)
                print(f'existing_assignment: {existing_assignment}')
                
                if not existing_assignment:
                    raise CustomError('No se encontró tu asignación','400',400)
                
                # Marcar como revelado
                tableAssigments.update_item(
                    Key={
                        'id': session_id,
                        'nickname': nickname
                    },
                    UpdateExpression='SET hasRevealed = :true_val, revealedAt = :t',
                    ConditionExpression='attribute_exists(nickname) AND hasRevealed = :false_val',
                    ExpressionAttributeValues={
                            ':true_val': True,
                            ':false_val': False,
                            ':t': current_time
                        }
                    )
                
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({'success': True, 'assignedTo': existing_assignment['assignedTo']})
                }
            
        except dynamodb.meta.client.exceptions.ConditionalCheckFailedException:
            raise CustomError('Ya revelaste tu amigo secreto','400',400)
            
        except Exception as e:
            print(f"Error: {str(e)}")
            import traceback
            traceback.print_exc()
            raise CustomError(str(e),'400',400)


    def generate_derangement(self,participants):
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


    def generate_derangement_deterministic(self,participants):
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
    
    
    def getSummary(self,event):
        """
        GET /session/{sessionId}/summary
        Solo disponible cuando todos han revelado
        Retorna todos los participantes y sus wishlists
        """
        try:
            session_id = event['pathParameters']['id']
            
            # Obtener sesión
            session = self.table.get_item(
                Key={'id': session_id}
            )
            
            if 'Item' not in session:
                raise CustomError('Sesión no encontrada','400',400)
            
            participants = session['Item'].get('participants', [])
            
            # Obtener todos los assignments
            tablaAssigments = dynamodb.Table('amigo_secreto')
            response = tablaAssigments.query(
                KeyConditionExpression='id = :id',
                ExpressionAttributeValues={':id': session_id}
            )
            
            assignments = response.get('Items', [])
            
            # Verificar que todos hayan revelado
            if len([a for a in assignments if a.get('hasRevealed')]) != len(participants):
                raise CustomError('Aún hay participantes pendientes','400',400)
            
            # Crear resumen
            summary = []
            for participant in participants:
                assignment = next((a for a in assignments if a['nickname'] == participant), None)
                summary.append({
                    'nickname': participant,
                    'avatar': assignment.get('avatar', '🎁') if assignment else '🎁',  # ← NUEVO
                    'wishlist': assignment.get('wishlist', []) if assignment else []  # ← Array
                })
            print(f'summary: {summary}')            
            clean_data = replace_decimal(summary)
            print(f'summary2: {clean_data}')
            
            return {
                'statusCode': 200,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,GET"
                },
                'body': json.dumps({'success': True, 'summary': clean_data})
            }
            
        except Exception as e:
            print(f"Error: {str(e)}")
            raise CustomError(str(e),'400',400)
            
    def updateWishlist(self,event):
        """
        PUT /session/{sessionId}/wishlist
        Body: { "nickname": "user1", "wishlist": "..." }
        """
        try:
            session_id = event['pathParameters']['id']
            body = json.loads(event['body'])
            nickname = body.get('nickname', '').strip()
            wishlist = body.get('wishlist', [])
            print(f'nickname: {nickname}')
            print(f'wishlist: {wishlist}')
            
            # Validar que wishlist sea una lista
            if not isinstance(wishlist, list):
                wishlist = []
                #raise CustomError('Wishlist debe ser un array','400',400)
                
            
            tablaAssigments = dynamodb.Table('amigo_secreto')
            response = tablaAssigments.update_item(
                Key={'id': session_id, 'nickname': nickname},
                UpdateExpression='SET wishlist = :w',
                ExpressionAttributeValues={':w': wishlist},
                ConditionExpression='attribute_exists(nickname)'
            )
            print(f'response: {response}')
            
            return {
                'statusCode': 200,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,PUT"
                },
                'body': json.dumps({'success': True})
            }
            
        except Exception as e:
            print(f"Error: {str(e)}")
            raise CustomError(str(e),'400',400)
        
                    
                    