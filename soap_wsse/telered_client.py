import abc
import logging
from datetime import datetime
from zeep import Client
import xml.etree.ElementTree as ET
import os
from zeep.transports import Transport
from requests import Session
from lxml.builder import ElementMaker
from lxml import etree

from wsse_client import SecureWSSE
from wsse_output_policy import SOAPResponseProcessor
from aws_lambda_powertools.event_handler.api_gateway import Response

_logger = logging.getLogger()
_logger.setLevel(logging.INFO)

logging.basicConfig(level=logging.DEBUG)

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
            signing_cert_pem_path = os.path.join(base_dir, "banco-private_cert.pem")
            encrypt_cert_file_path = os.path.join(base_dir, "trusted-telered.pem")
            
            # Generar el envelope WSSE    
            soap_wsse = SecureWSSE(
                username="col-158",
                password="b1386235124a19dfe867d41683c5f5e3eadb744b",                
                signing_cert_pem = signing_cert_pem_path,        
                encrypt_cert_file= encrypt_cert_file_path
            )

            _logger.info(f"******Iniciando conexion a backend****")
            #soap_envelope = self.client.create_message(self.client.service, 'GetSession', canal="SP")

            NSMAP = {
                'soapenv': 'http://schemas.xmlsoap.org/soap/envelope/',               
                'dto': 'http://dto.eis.pasarela.hubpagos.bytesw.com/'
            }

            BODY_NSMAP = {
                'soapenv': 'http://schemas.xmlsoap.org/soap/envelope/',               
                'dto': 'http://dto.eis.pasarela.hubpagos.bytesw.com/',
                'wsu': 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd'
            }

            # ElementMaker con namespaces
            SOAPENV = ElementMaker(namespace=NSMAP['soapenv'], nsmap=NSMAP)
            SOAPENV_BODY = ElementMaker(namespace=NSMAP['soapenv'], nsmap=BODY_NSMAP)     
            DTO = ElementMaker(namespace=NSMAP['dto'])

            # Construir el envelope
            header = SOAPENV.Header()
            body = SOAPENV_BODY.Body(
                DTO.GetSessionRequest(
                    etree.Element("canal")
                )
            )

            body[0][0].text = "SP"  # canal.text = "SP"

            soap_envelope = SOAPENV.Envelope(header, body)

            _logger.info(f"Envelope creado: {etree.tostring(soap_envelope, pretty_print=True, xml_declaration=True, encoding="UTF-8").decode()}")

            # Le aplica al envelope WSSE (usernametoken, firma, cifrado)
            envelope, headers = soap_wsse.apply(soap_envelope, {})

            headers = {
                    "Content-Type": "text/xml; charset=utf-8",
                    "SOAPAction": "http://pasarela.hubpagos.bytesw.com/GetSession"
                }
            envelope_str = etree.tostring(envelope, xml_declaration=True, encoding="UTF-8").decode()
            #_logger.info(f"Envelope: {envelope_str}")

            #Comentado temporalmente, mientras se resuelve el tema del timeout
            response = self.client.transport.post(address=self.url, message=envelope_str, headers=headers)

            print("HTTP Status:", response.status_code)
            print("Header Response:", response.headers)
            #print("Response:", response.content.decode())

            if response.status_code == 200:
                processor = SOAPResponseProcessor()
                decrypted_content = processor.process_response(response.content.decode())

                _logger.info(f"Contenido desencriptado: {decrypted_content}")

                # Parsear XML
                json_result = {}
                root = etree.fromstring(decrypted_content)
                sesion_id_elem = root.find('.//sesionId')
                json_result['sesionId'] = sesion_id_elem.text
                _logger.info(f"JSON Result: {json_result}")
            
            else:
                json_result = {
                    "error": "Error al procesar la solicitud",                    
                    "message": response.content.decode()
                }
            
            result = Response(
                status_code=response.status_code,
                headers={},
                body=json_result
            )
            
            return result
        
        except Exception as e:
            raise e