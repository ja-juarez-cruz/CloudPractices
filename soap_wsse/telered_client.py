import abc
import logging
from datetime import datetime
from zeep import Client
import xml.etree.ElementTree as ET
import os
from zeep.transports import Transport
from requests import Session

from wsse_client import SecureWSSE
from aws_lambda_powertools.event_handler.api_gateway import Response

_logger = logging.getLogger()
_logger.setLevel(logging.INFO)

logging.basicConfig(level=logging.DEBUG)

logging.getLogger("zeep").setLevel(logging.DEBUG)
logging.getLogger("requests").setLevel(logging.DEBUG)
logging.getLogger('urllib3').setLevel(logging.DEBUG)
logging.getLogger("zeep.transport").setLevel(logging.DEBUG)
logging.getLogger("http.client").setLevel(logging.DEBUG)  # Para ver tráfico HTTP crudo

# Opcional: para ver el cuerpo exacto (útil para WS con seguridad)
#logging.getLogger("zeep.wsdl.messages").setLevel(logging.DEBUG)
#logging.getLogger("zeep.client").setLevel(logging.DEBUG)

now = datetime.now()
transactionDate = now.strftime("%Y-%m-%dT%H:%M:%S")


class ClientCustom(metaclass=abc.ABCMeta):

    @abc.abstractmethod
    def get_session(self)->dict:
        pass


class TeleredClient(ClientCustom):
    def __init__(self, url: str):
        base_dir = os.path.dirname(os.path.abspath(__file__))  
        wsdl_path = os.path.join(base_dir, "PasarelaWS.wsdl")
        wsdl_path = os.path.normpath(wsdl_path)
        _logger.info(f"Usando WSDL en: {wsdl_path}")

        #wsdl_url = "../../models/telered/PasarelaWS.wsdl"
        session = Session()
        transport = Transport(session=session)
        self.client = Client(wsdl=wsdl_path,transport=transport)
        if url:
            self.client.service._binding_options["address"] = url
        self.url = self.client.service._binding_options["address"]
    
    def get_session(self)->dict:
        try:
            base_dir = os.path.dirname(os.path.abspath(__file__)) 
            signing_key_path = os.path.join(base_dir, "banco-private_key.pem")
            signing_cert_pem_path = os.path.join(base_dir, "banco-private_cert.pem")
            encrypt_cert_file_path = os.path.join(base_dir, "trusted-telered.pem")
            
            # Generar el envelope WSSE    
            soap_wsse = SecureWSSE(
                username="col-158",
                password="b1386235124a19dfe867d41683c5f5e3eadb744b",
                signing_key = signing_key_path,
                signing_cert_pem = signing_cert_pem_path,        
                encrypt_cert_file= encrypt_cert_file_path
            )

            _logger.info(f"******Iniciando conexion a backend****")
            soap_envelope = self.client.create_message(self.client.service, 'GetSession', canal="SP")
            
            envelope, headers = soap_wsse.apply(soap_envelope, {})

            headers = {
                    "Content-Type": "text/xml; charset=utf-8",
                    "SOAPAction": "GetSession"
                }
            envelope_str = ET.tostring(envelope).decode()
            _logger.info(f"Envelope: {envelope_str}")

            #Comentado temporalmente, mientras se resuelve el tema del timeout
            response = self.client.transport.post(address=self.url, message=envelope_str, headers=headers)


            """try:
                response = self.client.transport.post(address=self.url, message=envelope_str, headers=headers)
                
            except Exception as e:
                if self.client.transport.history:
                    last_response = self.client.transport.history[-1]
                    print("Status Code:", last_response.status_code)
                    print("Respuesta HTTP:", last_response.content.decode())  # Body de la respuesta
                    print("Headers:", last_response.headers)  # Cabeceras de la respuesta
                raise e  # Relanza la excepción para ver el error original"""

            print("HTTP Status:", response.status_code)
            print("Header Response:", response.headers)
            print("Response:", response.content.decode())            
            #print(self.client.transport.last_sent) 
            #print(self.client.transport.last_received)  

            
            result = Response(
                status_code=response.status_code,
                headers={},
                body=response.content.decode()
            )

            """result = Response(
                status_code=200,
                headers={},
                body=json.dumps({
                    "sesionId": "xwGeulIpuBoWnTs4Gaex"
                })
            )"""
            
            return result
        
        except Exception as e:
            raise e