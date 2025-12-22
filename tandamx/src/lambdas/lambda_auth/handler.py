# ========================================
# LAMBDA: auth_handler.py
# Maneja autenticación: login, register, refresh token
# ========================================

import json
import boto3
import hashlib
import jwt
import os
from datetime import datetime, timedelta
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
usuarios_table = dynamodb.Table(os.environ['USUARIOS_TABLE'])

# Configuración JWT
JWT_SECRET = os.environ['JWT_SECRET']
JWT_REFRESH_SECRET = os.environ['JWT_REFRESH_SECRET']

# Utilidades
def cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Content-Type': 'application/json'
    }

def response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': cors_headers(),
        'body': json.dumps(body, default=str)
    }

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token(user_id, email, expires_in_hours=1):
    payload = {
        'id': user_id,
        'email': email,
        'exp': datetime.utcnow() + timedelta(hours=expires_in_hours)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

def generate_refresh_token(user_id):
    payload = {
        'id': user_id,
        'exp': datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_REFRESH_SECRET, algorithm='HS256')

# ========================================
# HANDLER: LOGIN
# ========================================
def login(event, context):
    try:
        body = json.loads(event['body'])
        email = body.get('email')
        password = body.get('password')
        
        if not email or not password:
            return response(400, {
                'success': False,
                'error': {
                    'code': 'MISSING_CREDENTIALS',
                    'message': 'Email y password son requeridos'
                }
            })
        
        # Buscar usuario por email usando GSI
        result = usuarios_table.query(
            IndexName='email-index',
            KeyConditionExpression='email = :email',
            ExpressionAttributeValues={':email': email}
        )
        print(f'result: {result}')
        
        if not result.get('Items'):
            return response(401, {
                'success': False,
                'error': {
                    'code': 'INVALID_CREDENTIALS',
                    'message': 'Email o contraseña incorrectos'
                }
            })
        
        usuario = result['Items'][0]
        
        # Verificar password
        hashed_password = hash_password(password)
        if usuario['passwordHash'] != hashed_password:
            return response(401, {
                'success': False,
                'error': {
                    'code': 'INVALID_CREDENTIALS',
                    'message': 'Email o contraseña incorrectos'
                }
            })
        
        # Generar tokens
        token = generate_token(usuario['id'], usuario['email'])
        refresh_token = generate_refresh_token(usuario['id'])
        print(f'token: {token}')
        print(f'refresh_token: {refresh_token}')
        print(f'usuario: {usuario}')
        
        # Actualizar lastLogin
        usuarios_table.update_item(
            Key={'id': usuario['id']},
            UpdateExpression='SET lastLogin = :now',
            ExpressionAttributeValues={':now': datetime.utcnow().isoformat()}
        )
        
        return response(200, {
            'success': True,
            'data': {
                'id': usuario['id'],
                'email': usuario['email'],
                'nombre': usuario['nombre'],
                'token': token,
                'refreshToken': refresh_token,
                'expiresIn': 3600
            }
        })
        
    except Exception as e:
        print(f"Error en login: {str(e)}")
        return response(500, {
            'success': False,
            'error': {
                'code': 'INTERNAL_SERVER_ERROR',
                'message': {str(e)}
            }
        })

# ========================================
# HANDLER: REGISTER
# ========================================
def register(event, context):
    try:
        body = json.loads(event['body'])
        email = body.get('email')
        password = body.get('password')
        nombre = body.get('nombre')
        telefono = body.get('telefono', '')
        
        if not email or not password or not nombre:
            return response(400, {
                'success': False,
                'error': {
                    'code': 'MISSING_FIELDS',
                    'message': 'Email, password y nombre son requeridos'
                }
            })
        
        # Verificar si el email ya existe
        result = usuarios_table.query(
            IndexName='email-index',
            KeyConditionExpression='email = :email',
            ExpressionAttributeValues={':email': email}
        )
        
        if result.get('Items'):
            return response(400, {
                'success': False,
                'error': {
                    'code': 'EMAIL_EXISTS',
                    'message': 'El email ya está registrado'
                }
            })
        
        # Crear usuario
        import uuid
        user_id = f"user_{uuid.uuid4().hex[:8]}"
        timestamp = datetime.utcnow().isoformat()
        
        usuario = {
            'id': user_id,
            'email': email,
            'nombre': nombre,
            'telefono': telefono,
            'passwordHash': hash_password(password),
            'role': 'admin',
            'tandas': [],
            'createdAt': timestamp,
            'updatedAt': timestamp,
            'lastLogin': timestamp
        }
        print(f'usuario a crear: {usuario}')
        
        usuarios_table.put_item(Item=usuario)
        
        # Generar tokens
        token = generate_token(user_id, email)
        refresh_token = generate_refresh_token(user_id)
        
        return response(201, {
            'success': True,
            'data': {
                'id': user_id,
                'email': email,
                'nombre': nombre,
                'token': token,
                'refreshToken': refresh_token,
                'expiresIn': 3600
            }
        })
        
    except Exception as e:
        print(f"Error en register: {str(e)}")
        return response(500, {
            'success': False,
            'error': {
                'code': 'INTERNAL_SERVER_ERROR',
                'message': 'Error al registrar usuario'
            }
        })

# ========================================
# HANDLER: REFRESH TOKEN
# ========================================
def refresh_token_handler(event, context):
    try:
        body = json.loads(event['body'])
        refresh_token = body.get('refreshToken')
        
        if not refresh_token:
            return response(400, {
                'success': False,
                'error': {
                    'code': 'MISSING_TOKEN',
                    'message': 'Refresh token es requerido'
                }
            })
        
        # Verificar refresh token
        try:
            payload = jwt.decode(refresh_token, JWT_REFRESH_SECRET, algorithms=['HS256'])
            print(f'payload: {payload}')
            user_id = payload['id']
            
        except jwt.ExpiredSignatureError:
            return response(401, {
                'success': False,
                'error': {
                    'code': 'TOKEN_EXPIRED',
                    'message': 'Refresh token expirado'
                }
            })
        except jwt.InvalidTokenError:
            return response(401, {
                'success': False,
                'error': {
                    'code': 'INVALID_TOKEN',
                    'message': 'Refresh token inválido'
                }
            })
        
        # Obtener usuario
        result = usuarios_table.get_item(Key={'id': user_id})
        
        if not result.get('Item'):
            return response(404, {
                'success': False,
                'error': {
                    'code': 'USER_NOT_FOUND',
                    'message': 'Usuario no encontrado'
                }
            })
        
        usuario = result['Item']
        
        # Generar nuevo token
        new_token = generate_token(user_id, usuario['email'])
        
        return response(200, {
            'success': True,
            'data': {
                'token': new_token,
                'expiresIn': 3600
            }
        })
        
    except Exception as e:
        print(f"Error en refresh token: {str(e)}")
        return response(500, {
            'success': False,
            'error': {
                'code': 'INTERNAL_SERVER_ERROR',
                'message': 'Error al refrescar token'
            }
        })


def lambda_handler(event, context):
    print(f"event: {event}")
    method = event.get("httpMethod")
    path = event.get("path")
    routeKey = event.get('routeKey')
    print(f'routeKey: {routeKey}')
    
    try:
        status_code = 200
        if routeKey == 'POST /auth/login':
            print('/auth/login')
            return login(event,context)
        
        elif routeKey == 'POST /auth/refresh':
            print('/auth/refresh')
            return refresh_token_handler(event,context)
        
        elif routeKey == 'POST /auth/register':
            print('/auth/register')
            return register(event,context)
            
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