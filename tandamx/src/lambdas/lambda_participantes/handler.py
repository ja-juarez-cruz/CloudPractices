# ========================================
# LAMBDA: participantes_handler.py
# Maneja CRUD de participantes
# ========================================

import json
import boto3
import os
import jwt
from datetime import datetime
from decimal import Decimal
import uuid

#custom error
from exception.custom_http_exception import CustomError
from exception.custom_http_exception import CustomClientError

dynamodb = boto3.resource('dynamodb')
tandas_table = dynamodb.Table(os.environ['TANDAS_TABLE'])
participantes_table = dynamodb.Table(os.environ['PARTICIPANTES_TABLE'])
LINKS_TABLE = 'links_registro'

JWT_SECRET = os.environ['JWT_SECRET']

# Utilidades (mismas que en tandas_handler.py)
def cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Content-Type': 'application/json'
    }

def decimal_default(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError


def response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': cors_headers(),
        'body': json.dumps(body, cls=DecimalEncoder)
    }

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super(DecimalEncoder, self).default(obj)

def extract_user_id(event):
    try:
        auth_header = event['headers'].get('Authorization') or event['headers'].get('authorization')
        if not auth_header:
            return None
        token = auth_header.replace('Bearer ', '')
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload['id']
    except:
        return None

def generate_short_id():
    import random
    import string
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))

def verificar_permisos_tanda(tanda_id, user_id):
    """Verifica que el usuario sea dueño de la tanda"""
    result = tandas_table.get_item(Key={'id': tanda_id})
    if not result.get('Item'):
        return False, 'Tanda no encontrada'
    if result['Item']['adminId'] != user_id:
        return False, 'Sin permisos'
    return True, result['Item']

# ========================================
# HANDLER: AGREGAR PARTICIPANTE
# ========================================
def agregar(event, context):
    try:
        user_id = extract_user_id(event)
        if not user_id:
            return response(401, {
                'success': False,
                'error': {'code': 'UNAUTHORIZED', 'message': 'Token inválido'}
            })
        
        tanda_id = event['pathParameters']['tandaId']
        body = json.loads(event['body'])
        
        # Verificar permisos
        tiene_permisos, result = verificar_permisos_tanda(tanda_id, user_id)
        print(f'tiene permisos: {tiene_permisos}')
        print(f'result: {result}')
        if not tiene_permisos:
            return response(403 if result != 'Tanda no encontrada' else 404, {
                'success': False,
                'error': {'code': 'FORBIDDEN', 'message': result}
            })
        
        # Validar campos requeridos
        if not body.get('nombre') or not body.get('telefono') or not body.get('numeroAsignado'):
            return response(400, {
                'success': False,
                'error': {
                    'code': 'MISSING_FIELDS',
                    'message': 'Nombre, teléfono y número asignado son requeridos'
                }
            })
        
        # Verificar número duplicado
        participantes_result = participantes_table.query(
            KeyConditionExpression='id = :tandaId',
            ExpressionAttributeValues={':tandaId': tanda_id}
        )
        print(f'partcipantes_result: {participantes_result}')
        
        for p in participantes_result.get('Items', []):
            if p['numeroAsignado'] == int(body['numeroAsignado']):
                return response(400, {
                    'success': False,
                    'error': {
                        'code': 'NUMERO_DUPLICADO',
                        'message': f"El número {body['numeroAsignado']} ya está asignado"
                    }
                })
        
        # Crear participante
        participante_id = f"part_{generate_short_id()}"
        timestamp = datetime.utcnow().isoformat()
        
        participante = {
            'id': tanda_id,
            'participanteId': participante_id,
            'nombre': body['nombre'],
            'telefono': body['telefono'],
            'email': body.get('email', ''),
            'numeroAsignado': int(body['numeroAsignado']),
            'createdAt': timestamp,
            'updatedAt': timestamp
        }
        
        participantes_table.put_item(Item=participante)
        participante['tandaId']= tanda_id
        
        return response(201, {
            'success': True,
            'data': participante
        })
        
    except Exception as e:
        print(f"Error en agregar participante: {str(e)}")
        return response(500, {
            'success': False,
            'error': {'code': 'INTERNAL_SERVER_ERROR', 'message': 'Error al agregar participante'}
        })

# ========================================
# HANDLER: LISTAR PARTICIPANTES
# ========================================
def listar(event, context):
    try:
        tanda_id = event['pathParameters']['tandaId']
        
        # Obtener participantes
        result = participantes_table.query(
            KeyConditionExpression='id = :tandaId',
            ExpressionAttributeValues={':tandaId': tanda_id}
        )
        
        participantes = result.get('Items', [])
        
        # Ordenar por número asignado
        participantes.sort(key=lambda x: x['numeroAsignado'])
        
        return response(200, {
            'success': True,
            'data': {
                'participantes': participantes,
                'total': len(participantes)
            }
        })
        
    except Exception as e:
        print(f"Error en listar participantes: {str(e)}")
        return response(500, {
            'success': False,
            'error': {'code': 'INTERNAL_SERVER_ERROR', 'message': 'Error al listar'}
        })

# ========================================
# HANDLER: ACTUALIZAR PARTICIPANTE
# ========================================
def actualizar(event, context):
    try:
        user_id = extract_user_id(event)
        if not user_id:
            return response(401, {
                'success': False,
                'error': {'code': 'UNAUTHORIZED', 'message': 'Token inválido'}
            })
        
        tanda_id = event['pathParameters']['tandaId']
        participante_id = event['pathParameters']['participanteId']
        body = json.loads(event['body'])
        
        # Verificar permisos
        tiene_permisos, _ = verificar_permisos_tanda(tanda_id, user_id)
        if not tiene_permisos:
            return response(403, {
                'success': False,
                'error': {'code': 'FORBIDDEN', 'message': 'Sin permisos'}
            })
        
        # Verificar que el participante existe
        participante = participantes_table.get_item(
            Key={'id': tanda_id, 'participanteId': participante_id}
        )
        
        if not participante.get('Item'):
            return response(404, {
                'success': False,
                'error': {'code': 'NOT_FOUND', 'message': 'Participante no encontrado'}
            })
        
        # Si se está cambiando el número, verificar que no esté duplicado
        if 'numeroAsignado' in body:
            participantes_result = participantes_table.query(
                KeyConditionExpression='id = :tandaId',
                ExpressionAttributeValues={':tandaId': tanda_id}
            )
            
            for p in participantes_result.get('Items', []):
                if (p['participanteId'] != participante_id and 
                    p['numeroAsignado'] == int(body['numeroAsignado'])):
                    return response(400, {
                        'success': False,
                        'error': {
                            'code': 'NUMERO_DUPLICADO',
                            'message': f"El número {body['numeroAsignado']} ya está asignado"
                        }
                    })
        
        # Construir expresión de actualización
        update_expression = "SET updatedAt = :now"
        expression_values = {':now': datetime.utcnow().isoformat()}
        
        if 'nombre' in body:
            update_expression += ", nombre = :nombre"
            expression_values[':nombre'] = body['nombre']
        
        if 'telefono' in body:
            update_expression += ", telefono = :telefono"
            expression_values[':telefono'] = body['telefono']
        
        if 'email' in body:
            update_expression += ", email = :email"
            expression_values[':email'] = body['email']
        
        if 'numeroAsignado' in body:
            update_expression += ", numeroAsignado = :numeroAsignado"
            expression_values[':numeroAsignado'] = int(body['numeroAsignado'])
        
        # Actualizar
        participantes_table.update_item(
            Key={'id': tanda_id, 'participanteId': participante_id},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_values
        )
        
        return response(200, {
            'success': True,
            'data': {
                'participanteId': participante_id,
                'updatedAt': expression_values[':now']
            }
        })
        
    except Exception as e:
        print(f"Error en actualizar participante: {str(e)}")
        return response(500, {
            'success': False,
            'error': {'code': 'INTERNAL_SERVER_ERROR', 'message': 'Error al actualizar'}
        })

# ========================================
# HANDLER: ELIMINAR PARTICIPANTE
# ========================================
def eliminar(event, context):
    try:
        user_id = extract_user_id(event)
        if not user_id:
            return response(401, {
                'success': False,
                'error': {'code': 'UNAUTHORIZED', 'message': 'Token inválido'}
            })
        
        tanda_id = event['pathParameters']['tandaId']
        participante_id = event['pathParameters']['participanteId']
        
        # Verificar permisos
        tiene_permisos, _ = verificar_permisos_tanda(tanda_id, user_id)
        if not tiene_permisos:
            return response(403, {
                'success': False,
                'error': {'code': 'FORBIDDEN', 'message': 'Sin permisos'}
            })
        
        # Eliminar participante
        participantes_table.delete_item(
            Key={'id': tanda_id, 'participanteId': participante_id}
        )
        
        return response(200, {
            'success': True,
            'message': 'Participante eliminado exitosamente'
        })
        
    except Exception as e:
        print(f"Error en eliminar participante: {str(e)}")
        return response(500, {
            'success': False,
            'error': {'code': 'INTERNAL_SERVER_ERROR', 'message': 'Error al eliminar'}
        })


# =======================================
# Registro de participante publico
# =======================================
def registro_publico_participante(event, context):
    """
    Registra participante(s) en la tanda
    
    Body esperado:
    {
        "nombre": "Juan Pérez",
        "telefono": "5512345678",
        "email": "juan@example.com",  # opcional
        "numeros": [1, 5, 12]  # máximo 50% del total
    }
    """
    try:
        # Obtener token del path
        token = event['pathParameters']['token']
        
        # Parse body
        body = json.loads(event['body'])
        nombre = body.get('nombre', '').strip()
        telefono = body.get('telefono', '').strip()
        email = body.get('email', '').strip()
        numeros = body.get('numeros', [])
        
        # Validaciones básicas
        if not nombre or not telefono:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'success': False,
                    'error': {
                        'message': 'Nombre y teléfono son obligatorios'
                    }
                })
            }
        
        if not numeros or not isinstance(numeros, list):
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'success': False,
                    'error': {
                        'message': 'Debe seleccionar al menos un número'
                    }
                })
            }
        
        # Buscar el link en la tabla
        links_table = dynamodb.Table(LINKS_TABLE)
        response = links_table.get_item(
            Key={'token': token}
        )
        
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'success': False,
                    'error': {
                        'message': 'Link de registro no encontrado'
                    }
                })
            }
        
        link = response['Item']
        
        # Verificar si está activo
        if not link.get('activo', True):
            return {
                'statusCode': 403,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'success': False,
                    'error': {
                        'message': 'Link de registro desactivado'
                    }
                })
            }
        
        # Verificar si expiró
        expiracion = link.get('expiracion', 0)
        if datetime.utcnow().timestamp() > expiracion:
            return {
                'statusCode': 403,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'success': False,
                    'error': {
                        'message': 'Link de registro expirado'
                    }
                })
            }
        
        # Obtener datos de la tanda        
        response = tandas_table.get_item(
            Key={
                'id': link['tandaId']
            }
        )
        
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'success': False,
                    'error': {
                        'message': 'Tanda no encontrada'
                    }
                })
            }
        
        tanda = response['Item']
        total_rondas = int(tanda.get('totalRondas', 0))
        max_numeros = total_rondas // 2  # 50%
        
        # Validar cantidad de números
        if len(numeros) > max_numeros:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'success': False,
                    'error': {
                        'message': f'Solo puedes seleccionar hasta {max_numeros} números (50% del total)'
                    }
                })
            }
        
        # Obtener números ya ocupados
        # Obtener números ya ocupados consultando tabla participantes
        response = participantes_table.query(            
            KeyConditionExpression='id = :tandaId',
            ExpressionAttributeValues={
                ':tandaId': link['tandaId']
            }
        )
        
        participantes_existentes = response.get('Items', [])
        numeros_ocupados = [p.get('numeroAsignado') for p in participantes_existentes]
        
        # Verificar que los números estén disponibles
        for numero in numeros:
            if numero in numeros_ocupados:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Content-Type': 'application/json'
                    },
                    'body': json.dumps({
                        'success': False,
                        'error': {
                            'message': f'El número {numero} ya está ocupado'
                        }
                    })
                }
            
            if numero < 1 or numero > total_rondas:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Content-Type': 'application/json'
                    },
                    'body': json.dumps({
                        'success': False,
                        'error': {
                            'message': f'Número {numero} fuera de rango (1-{total_rondas})'
                        }
                    })
                }
        
        #  Crear participantes en tabla participantes (uno por cada número)
        nuevos_participantes = []
        for numero in numeros:
            participante_id = f'part_{uuid.uuid4().hex[:12]}'
            
            participante = {
                'participanteId': participante_id,
                'id': link['tandaId'],
                'tandaId': link['tandaId'],
                'userId': link['userId'],
                'nombre': nombre,
                'telefono': telefono,
                'numeroAsignado': Decimal(str(numero)),
                'createdAt': datetime.utcnow().isoformat(),
                'registradoPorLink': True  # Marcar que fue registrado públicamente
            }
            
            if email:
                participante['email'] = email
            
            # Insertar participante en la tabla
            participantes_table.put_item(Item=participante)
            
            nuevos_participantes.append({
                'participanteId': participante_id,
                'nombre': nombre,
                'telefono': telefono,
                'numeroAsignado': numero
            })
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'success': True,
                'data': {
                    'participantes': nuevos_participantes,
                    'tandaId': link['tandaId'],
                    'mensaje': f'{len(numeros)} participante(s) registrado(s) exitosamente'
                }
            }, default=decimal_default)
        }
        
    except Exception as e:
        print(f"Error registrando participante: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'success': False,
                'error': {
                    'message': 'Error interno del servidor',
                    'details': str(e)
                }
            })
        }

def lambda_handler(event, context):
    print(f"event: {event}")
    method = event.get("httpMethod")
    path = event.get("path")
    routeKey = event.get('routeKey')
    print(f'routeKey: {routeKey}')
    
    try:
        status_code = 200
        if routeKey == "POST /tandas/{tandaId}/participantes":
            print(routeKey)
            return agregar(event,context)
        
        elif routeKey == 'GET /tandas/{tandaId}/participantes':
            print(routeKey)
            return listar(event,context)
        
        elif routeKey == 'PUT /tandas/{tandaId}/participantes/{participanteId}':
            print(routeKey)
            return actualizar(event, context)    
        
        elif routeKey == 'DELETE /tandas/{tandaId}/participantes/{participanteId}':
            print(routeKey)
            return eliminar(event,context)
        
        elif routeKey == 'POST /registro/{token}':
            print('Registro publico de participante')
            return registro_publico_participante(event,context)
            
        else:  
            status_code = 400
            body_response = {
                "error_code": "0001",
                "error_msg": "Recurso invalido"
            }      
        return {
                "statusCode": status_code,
                "body": json.dumps(body_response,default=str)
            }
    except Exception as e:
        print(f"error main: {str(e)}")
        if isinstance(e,CustomError):
            return CustomClientError().standar_errors_formatting(e,event)
        else:
            return {
                "statusCode": 400,
                "body": {
                    "codeError": '400',
                    "message": str(e)
                }
            }