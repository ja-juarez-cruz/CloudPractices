import json
import boto3
from datetime import datetime
#import pytz
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key, Attr


#custom error
from exception.custom_http_exception import CustomError
from exception.custom_http_exception import CustomClientError

#Adaptadores
from adapters.dynamo_client import DynamoClient

TIMEZONE = 'America/Mexico_City'  # Zona horaria de México
#tz = pytz.timezone(TIMEZONE)
#fecha_actual = datetime.now(tz).date()
#fecha_str = fecha_actual.strftime('%Y-%m-%d')
#hora_str = datetime.now(tz).strftime("%H:%M:%S")

# Inicializa el cliente de DynamoDB
dynamodb = boto3.resource('dynamodb')
lambda_client = boto3.client('lambda')
Tablaamigo_secreto = DynamoClient("session")


def lambda_handler(event, context):
    print(f"event: {event}")
    method = event.get("httpMethod")
    path = event.get("path")
    
    try:
        status_code = 200
        if method == 'POST' and path.startswith("/amigo-secreto/session/") and path.endswith("/participants"):
            print('AddParticipants')
            return Tablaamigo_secreto.addParticipantes(event)
        
        elif method == 'GET' and path.startswith("/amigo-secreto/session/") and path.endswith("/status"):
            print('getStatus')
            return Tablaamigo_secreto.getStatus(event)
        
        elif method == 'POST' and path.startswith("/amigo-secreto/session/") and path.endswith("/claim"):
            print('claimNickName')
            return Tablaamigo_secreto.claimNickname(event)    
        
        elif method == 'POST' and path.startswith("/amigo-secreto/session/") and path.endswith("/reveal"):
            print('revealFriend')
            return Tablaamigo_secreto.revealFriend(event)
        
        elif method == 'PUT' and path.startswith("/amigo-secreto/session/") and path.endswith("/wishlist"):
            print('wishlist')
            return Tablaamigo_secreto.updateWishlist(event)
        
        elif method == 'GET' and path.startswith("/amigo-secreto/session/") and path.endswith("/summary"):
            print('getSummary')
            return Tablaamigo_secreto.getSummary(event)  
            
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
    
