import logging
import oracledb

# Directorio donde se ubica oracle instant client en tu layer
INSTANT_CLIENT_PATH = "/opt/oracle/instantclient_23_7"

# Inicializa thick mode
oracledb.init_oracle_client(lib_dir=INSTANT_CLIENT_PATH)
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):

    logger.info("***** Inicia execucion *************")

    connection = oracledb.connect(
        user="MOBILESTATSBANESCOPANAMA",
        password="qA$tcMB2k19",
        dsn="cbnkcal-scn.panama.banesco.lac:1521/TCMBBDCAL.PANAMA.BANESCO.LAC"
    )
    logger.info("Conectado")
    cursor = connection.cursor()
    logger.info("Conexion configurada")
    cursor.execute("SELECT 'Lambda OK!' FROM dual")
    result = cursor.fetchone()
    logger.info("Conexion finalizada")
    logger.info(f"Result: {result}")
    return {"result": result[0]}