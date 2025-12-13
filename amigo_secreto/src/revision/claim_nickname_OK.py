import boto3
from boto3.dynamodb.conditions import Key, Attr

dynamodb = boto3.resource('dynamodb')
tableAssignments = dynamodb.Table('assignments')

def claim_nickname(session_id, nickname):
    # 1. Validar si ya existen registros para esta session_id
    response = tableAssignments.query(
        KeyConditionExpression=Key('id').eq(session_id)
    )

    items = response.get("Items", [])

    # ---------------------------------------------------------
    # CASO A: PRIMER PARTICIPANTE EN RECLAMAR (no hay items)
    # ---------------------------------------------------------
    if len(items) == 0:
        print(f"Primer nickname reclamado en esta sesión: {nickname}")

        tableAssignments.put_item(
            Item={
                'id': session_id,
                'nickname': nickname,
                'claimed': True,
                'hasRevealed': False
            }
        )

        return {
            "action": "put_item",
            "message": "Primer participante reclamado."
        }

    # ---------------------------------------------------------
    # CASO B: YA HAY REGISTROS → solo actualizar
    # ---------------------------------------------------------
    print(f"Actualizando nickname existente: {nickname}")

    try:
        tableAssignments.update_item(
            Key={
                'id': session_id,
                'nickname': nickname
            },
            UpdateExpression="SET claimed = :c",
            ExpressionAttributeValues={
                ':c': True
            },
            ConditionExpression=Attr('claimed').eq(False)  # Solo si NO estaba reclamado
        )

        return {
            "action": "update_item",
            "message": "Nickname reclamado exitosamente."
        }

    except tableAssignments.meta.client.exceptions.ConditionalCheckFailedException:
        return {
            "error": "El nickname ya había sido reclamado."
        }
