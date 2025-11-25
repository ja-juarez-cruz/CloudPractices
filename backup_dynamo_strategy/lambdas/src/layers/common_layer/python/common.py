import json
import os
import datetime

# Custom JSON Encoder to handle datetime objects
class DateTimeEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, datetime.datetime):
            return o.isoformat()
        return super().default(o)

# Custom Error for Authorization
class AuthorizationError(Exception):
    pass

COGNITO_ERROR_MAP = {
    "NotAuthorizedException": 401,
    "UserNotFoundException": 404,
    "InvalidParameterException": 400,
    "UsernameExistsException": 409,
    "InvalidPasswordException": 400,
    "CodeMismatchException": 400,
    "ExpiredCodeException": 400,
    "LimitExceededException": 429,
}

def get_validated_env(key):
    value = os.environ.get(key, '').strip()
    if not value:
        print(f"Warning: Environment variable {key} not found.")
        return f"{key}_NOT_FOUND"
    return value

# Global variables for User Pool ID and Client ID
USER_POOL_ID = get_validated_env('USER_POOL_ID')
USER_POOL_CLIENT_ID = get_validated_env('USER_POOL_CLIENT_ID')

def api_response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': True,
        },
        'body': json.dumps(body, cls=DateTimeEncoder)
    }

def handle_error(error):
    if isinstance(error, AuthorizationError):
        return api_response(403, {'message': str(error)})
    
    if hasattr(error, 'response'): # Boto3 client error
        error_code = error.response.get('Error', {}).get('Code', 'UnknownError')
        status_code = COGNITO_ERROR_MAP.get(error_code, 500)
        message = error.response.get('Error', {}).get('Message', 'Internal server error')
        return api_response(status_code, {'message': message, 'code': error_code})

    return api_response(500, {'message': 'An internal server error occurred.'})

def require_groups(event, allowed_groups):
    try:
        claims = event['requestContext']['authorizer']['claims']
        groups_claim = claims.get('cognito:groups')
        
        user_groups = []
        if isinstance(groups_claim, str):
            user_groups = groups_claim.split(',')
        elif isinstance(groups_claim, list):
            user_groups = groups_claim

        if not any(group in allowed_groups for group in user_groups):
            raise AuthorizationError('User is not in an allowed group.')
            
    except (KeyError, TypeError):
        raise AuthorizationError('Missing authorization claims.')

def check_groups(event, allowed_groups):
    try:
        claims = event['requestContext']['authorizer']['claims']
        groups_claim = claims.get('cognito:groups')
        
        user_groups = []
        if isinstance(groups_claim, str):
            user_groups = groups_claim.split(' ')
        elif isinstance(groups_claim, list):
            user_groups = groups_claim

        return any(group in allowed_groups for group in user_groups)
            
    except (KeyError, TypeError):
        return False # Claims or groups missing