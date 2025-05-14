import os
import pyodbc
import logging
import urllib.request

_logger = logging.getLogger()
_logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    try:
       
        # Parámetros de conexión desde variables de entorno
        server = os.environ['SQL_SERVER']        
        username = os.environ['SQL_USERNAME']
        password = os.environ['SQL_PASSWORD']

        #Imprime los drivers disponibles
        print("Drivers disponibles:", pyodbc.drivers())        

        # Construir la cadena de conexión ODBC para Driver 18
        conn_str = (
            "DRIVER=ODBCDriver18forSQLServer;"
            f"SERVER={server};"
            "Port=1433;"           
            f"UID={username};"
            f"PWD={password};"
            "Encrypt=yes;"
            "TrustServerCertificate=yes;"
        )
        _logger.info(f"conn_str: {conn_str}")
        
        # Conectar y ejecutar una consulta de prueba
        with pyodbc.connect(conn_str, timeout=10) as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT GETDATE(), @@VERSION;")
                result = cursor.fetchone()
        
        _logger.info(f"ejecutado OK")

        return {
            'statusCode': 200,
            'body': f'Conexión exitosa. Fecha y hora del servidor SQL: {result[0]} VersionDb: {result[1]}'
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': f'Error de conexión: {str(e)}'
        }
