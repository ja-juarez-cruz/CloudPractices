from datetime import datetime

# Importando el adaptador externo
from telered_client import TeleredClient



now = datetime.now()
transactionDate = now.strftime("%Y-%m-%dT%H:%M:%S")


def lambda_handler() -> dict:    

    responseBackend = TeleredClient(None).get_session()    
    
    return responseBackend

if __name__ == "__main__":
    lambda_handler()