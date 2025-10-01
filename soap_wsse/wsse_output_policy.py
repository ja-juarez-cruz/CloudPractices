import logging
from lxml import etree
import base64
import xmlsec
from cryptography import x509
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
import tempfile
import os
from cryptography.hazmat.primitives import hashes

_logger = logging.getLogger()
_logger.setLevel(logging.INFO)
logging.basicConfig(level=logging.DEBUG)

class SOAPResponseProcessor:
    def __init__(self):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        self.private_cert_pem = os.path.join(base_dir, "BancoA_private_cert.pem")
        self.public_cert_file = os.path.join(base_dir, "pasarela_public_cert.pem")        

    def process_response(self, response_xml):
        """
        Procesa la respuesta SOAP: valida firma y desencripta
        """
        try:
            # Parsear el XML
            envelope = etree.fromstring(response_xml.encode() if isinstance(response_xml, str) else response_xml)
            
            #Validar la firma
            is_valid = self.validate_signature(envelope)
            if not is_valid:
                raise Exception("Firma digital inválida")
            _logger.info("Firma digital válida")
            
            #Desencriptar el contenido
            decrypted_content = self.decrypt_body(envelope)
            _logger.info("Contenido desencriptado exitosamente")
            
            return decrypted_content
            
        except Exception as e:
            _logger.error(f"Error procesando respuesta: {e}")
            raise

    def validate_signature(self, envelope):
        """
        Valida la firma digital de la respuesta
        """
        try:
            ns = {
                'env': 'http://schemas.xmlsoap.org/soap/envelope/',
                'wsse': 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd',
                'wsu': 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd',
                'ds': 'http://www.w3.org/2000/09/xmldsig#',
                'wsse11': 'http://docs.oasis-open.org/wss/oasis-wss-wssecurity-secext-1.1.xsd'
            }
            
            # Registrar IDs para xmlsec
            xmlsec.tree.add_ids(envelope, [
                "{" + ns['wsu'] + "}Id",
                "Id",
                "id"
            ])
            
            # Encontrar la firma
            signature_node = envelope.find('.//ds:Signature', ns)
            if signature_node is None:
                raise Exception("No se encontró elemento Signature")
            
            # Crear contexto de verificación
            ctx = xmlsec.SignatureContext()
            
            # Cargar certificado del servidor para verificación
            key = xmlsec.Key.from_file(self.public_cert_file, xmlsec.KeyFormat.CERT_PEM)
            ctx.key = key
            
            # Verificar la firma
            ctx.verify(signature_node)
            return True
            
        except xmlsec.Error as e:
            _logger.error(f"Error validando firma: {e}")
            return False
        except Exception as e:
            _logger.error(f"Error general validando firma: {e}")
            return False

    def decrypt_body(self, envelope):
        """
        Desencripta el contenido del Body
        """
        try:
            ns = {
                'env': 'http://schemas.xmlsoap.org/soap/envelope/',
                'xenc': 'http://www.w3.org/2001/04/xmlenc#',
                'ds': 'http://www.w3.org/2000/09/xmldsig#',
                'wsse': 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd'
            }
            
            # 1. Obtener la clave encriptada
            encrypted_key_elem = envelope.find('.//xenc:EncryptedKey', ns)
            if encrypted_key_elem is None:
                raise Exception("No se encontró EncryptedKey")
            
            encrypted_key_cipher = encrypted_key_elem.find('.//xenc:CipherValue', ns)
            encrypted_session_key = base64.b64decode(encrypted_key_cipher.text.strip())
            
            # 2. Desencriptar la clave de sesión con RSA
            session_key = self.decrypt_session_key_rsa_oaep(encrypted_session_key)
            
            # 3. Obtener los datos encriptados
            encrypted_data = envelope.find('.//xenc:EncryptedData', ns)
            if encrypted_data is None:
                raise Exception("No se encontró EncryptedData")
            
            cipher_value_elem = encrypted_data.find('.//xenc:CipherValue', ns)
            encrypted_content = base64.b64decode(cipher_value_elem.text.strip())
            
            # 4. Desencriptar el contenido con AES-128-CBC
            decrypted_content = self.decrypt_content_aes128(encrypted_content, session_key)
            
            return decrypted_content
            
        except Exception as e:
            _logger.error(f"Error desencriptando: {e}")
            raise

    def decrypt_session_key_rsa_oaep(self, encrypted_session_key):
        """
        Desencripta la clave de sesión usando RSA-OAEP
        """
        try:
            # Cargar tu clave privada
            with open(self.private_cert_pem, 'rb') as key_file:
                private_key_data = key_file.read()
            
            from cryptography.hazmat.primitives import serialization
            private_key = serialization.load_pem_private_key(
                private_key_data,
                password=None,  # Ajusta si tu clave tiene contraseña
                backend=default_backend()
            )
            
            # Desencriptar con RSA-OAEP (MGF1-SHA1)
            session_key = private_key.decrypt(
                encrypted_session_key,
                padding.OAEP(
                    mgf=padding.MGF1(algorithm=hashes.SHA1()),
                    algorithm=hashes.SHA1(),
                    label=None
                )
            )
            
            return session_key
            
        except Exception as e:
            _logger.error(f"Error desencriptando clave de sesión: {e}")
            raise

    def decrypt_content_aes128(self, encrypted_content, session_key):
        """
        Desencripta el contenido usando AES-128-CBC
        """
        try:
            # AES-128-CBC usa los primeros 16 bytes como IV
            iv = encrypted_content[:16]
            actual_encrypted_data = encrypted_content[16:]
            
            # Crear cipher AES-128-CBC
            cipher = Cipher(
                algorithms.AES(session_key[:16]),  # AES-128 necesita clave de 16 bytes
                modes.CBC(iv),
                backend=default_backend()
            )
            
            decryptor = cipher.decryptor()
            decrypted_padded = decryptor.update(actual_encrypted_data) + decryptor.finalize()
            
            # Remover padding PKCS7
            padding_length = decrypted_padded[-1]
            decrypted_content = decrypted_padded[:-padding_length]
            
            return decrypted_content.decode('utf-8')
            
        except Exception as e:
            _logger.error(f"Error desencriptando contenido AES: {e}")
            raise

# Ejemplo de uso
def main():   
    
    # Tu XML de respuesta
    response_xml = """<env:Envelope xmlns:env="http://schemas.xmlsoap.org/soap/envelope/"><env:Header><wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" env:mustUnderstand="1" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd"><ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="SIG-FAC5D7DB812F13CDC61753483687041152896"><ds:SignedInfo><ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"><ec:InclusiveNamespaces xmlns:ec="http://www.w3.org/2001/10/xml-exc-c14n#" PrefixList="env"/></ds:CanonicalizationMethod><ds:SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/><ds:Reference URI="#id-FAC5D7DB812F13CDC61753483687041152895"><ds:Transforms><ds:Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"><ec:InclusiveNamespaces xmlns:ec="http://www.w3.org/2001/10/xml-exc-c14n#" PrefixList=""/></ds:Transform></ds:Transforms><ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/><ds:DigestValue>8atZES3UvDsyWQbggmPWYQS1NNY=</ds:DigestValue></ds:Reference><ds:Reference URI="#SC-FAC5D7DB812F13CDC61753483687039152889"><ds:Transforms><ds:Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"><ec:InclusiveNamespaces xmlns:ec="http://www.w3.org/2001/10/xml-exc-c14n#" PrefixList="wsse env"/></ds:Transform></ds:Transforms><ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/><ds:DigestValue>/Oe7gUf+8F+d+pfQe3ogoBu8xlQ=</ds:DigestValue></ds:Reference></ds:SignedInfo><ds:SignatureValue>PueKUDQG0KPP2iJDhabMuQeBQ7ckZa8zUKcetWHmNzBnNwu0f8BvSKsE9hmLf/TwLtHCBcbdNVbIv50m9KbPn4OexHpIxkqsWML1VB5mDCxJP8tcmhfss/8jBZtDOaiYK9UlyrB6in8ntbcyIO46INbZCOiyvIP3JxOsWy+gb1znmxzPoK8IISV+QZbtqbXjLRFUH067pX06l2TKLHne9I1HcKonCS9ncYWyj4urNwS1uAbNgt8oUXNogxAy4sb9+69p1dvhPBh0Qbvhe/9KUCdb+ge3ArAf1zcOFzQuPQBNA+xCEcOqZP3q8YxcrddW8qcCpFDUbblS1PXLAkxkSg==</ds:SignatureValue><ds:KeyInfo Id="KI-FAC5D7DB812F13CDC61753483687041152893"><wsse:SecurityTokenReference xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" wsu:Id="STR-FAC5D7DB812F13CDC61753483687041152894"><ds:X509Data><ds:X509IssuerSerial><ds:X509IssuerName>CN=COL-158,OU=CAN-SP,O=ORGANIZATION,L=IST,ST=ST,C=PA</ds:X509IssuerName><ds:X509SerialNumber>864031817</ds:X509SerialNumber></ds:X509IssuerSerial></ds:X509Data></wsse:SecurityTokenReference></ds:KeyInfo></ds:Signature><xenc:EncryptedKey xmlns:xenc="http://www.w3.org/2001/04/xmlenc#" Id="EK-FAC5D7DB812F13CDC61753483687039152890"><xenc:EncryptionMethod Algorithm="http://www.w3.org/2001/04/xmlenc#rsa-oaep-mgf1p"/><ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#"><wsse:SecurityTokenReference><ds:X509Data><ds:X509IssuerSerial><ds:X509IssuerName>CN=osbdev.panama.banesco.lac,OU=Tecnologia,O=BANESCO S.A.,L=Panama,ST=Panama,C=PA</ds:X509IssuerName><ds:X509SerialNumber>1390261308</ds:X509SerialNumber></ds:X509IssuerSerial></ds:X509Data></wsse:SecurityTokenReference></ds:KeyInfo><xenc:CipherData><xenc:CipherValue>vvopSqcBj5ZywuSEnez4UhsuqbRuskp3Iif5qR1dhYtbWV4Uu61N+PrRpwCekR5+ZKFWJCkJhb2ZlxFZScYwt3gxEjXrUhn8WRWq4SmX16SOJk1xRbT/CzEctfufqeYywuK2mToOUkUTuD4t1UWRIEzHBRhEgiLRjcLCjcEDhV9ouST11WDO9x2rWGWJ4k0TZUUvIRJwb/mZjeG5PKtI1PptqRznDThej95k2FqKbJW4PeJAEim3CYucvmvDEa15WUjptnhHkRRyKMxLIKvwStnSMLLjkN5xnbaG0Da/4yqqbXc50APKVQsRxSr2Xo8RMXFhQwlmBx8dkxy5+kEe+g==</xenc:CipherValue></xenc:CipherData><xenc:ReferenceList><xenc:DataReference URI="#ED-FAC5D7DB812F13CDC61753483687040152891"/></xenc:ReferenceList></xenc:EncryptedKey><wsse11:SignatureConfirmation xmlns:wsse11="http://docs.oasis-open.org/wss/oasis-wss-wssecurity-secext-1.1.xsd" Value="Pn2cwcG0Eoza+2Pi1yWlZe39Qbbw6c5DPN3dNVwka7aurq5i6ENVsB9t22nUVsUo4OLFhJENn+XQoGVpsXHreGh3fF0AdSbz5K56ZTr9fIsC6/WcVFSDvBtJeMeZ0ix73cjoch4db69vDINHhW+iYIbU/FQWtEONfsLNh6+BLNjldwdBsTQHB4+gKlZYnwKaqBo+W2ggQJtRZrNNOa9p8cn0XfCx3wgjTG9u/S6aoxoqP4+/iulKlDghN6TgQywz/P1RjwCymZE2GdEQ/Vt4QPOpHchY1LOqK7Njydp8X21tHhOXkxTR//cvpcqffeckuNdVv/QkXSEhvOU6NsTSTg==" wsu:Id="SC-FAC5D7DB812F13CDC61753483687039152889"/></wsse:Security></env:Header><env:Body xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" wsu:Id="id-FAC5D7DB812F13CDC61753483687041152895"><xenc:EncryptedData xmlns:xenc="http://www.w3.org/2001/04/xmlenc#" Id="ED-FAC5D7DB812F13CDC61753483687040152891" Type="http://www.w3.org/2001/04/xmlenc#Content"><xenc:EncryptionMethod Algorithm="http://www.w3.org/2001/04/xmlenc#aes128-cbc"/><ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#"><wsse:SecurityTokenReference xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:wsse11="http://docs.oasis-open.org/wss/oasis-wss-wssecurity-secext-1.1.xsd" wsse11:TokenType="http://docs.oasis-open.org/wss/oasis-wss-soap-message-security-1.1#EncryptedKey"><wsse:Reference URI="#EK-FAC5D7DB812F13CDC61753483687039152890"/></wsse:SecurityTokenReference></ds:KeyInfo><xenc:CipherData><xenc:CipherValue>KVi5u6tSO7kWZeuy3Iis3SYtVa2+rfYfhTKEi9K+O+Digg9bzvBuouGpQdcF3DLeyEs6k7ppVW0BEEFj+Dlx/iam0Z7WYs3PmPYMMplib1KtzJvd2WdqfH6nlyK2V8O9KI2w2EKQeV7qHFpNchHhBoXlDB6WXOqP8IYXlRhBBTXY4MYz1S2+B13I3bLi8vN7PvCG8S/ffnJb8HAhmq6PsAQvjUnQIBacK7yhMpe3YzLfU2hbdVoU5Jwi4J22N4s9HLGJdNvM/fZ5ZZrHGnPj41/ho8B1FfQvwfmoPmsCvhZBqnu8TQCpy44DlLyYOV4VxD6HdH/QcrcoU7gJ+sJbnw==</xenc:CipherValue></xenc:CipherData></xenc:EncryptedData></env:Body></env:Envelope>"""
    
    try:
        processor = SOAPResponseProcessor()
        decrypted_content = processor.process_response(response_xml)

        _logger.info(f"Contenido desencriptado: {decrypted_content}")        
        
    except Exception as e:
        _logger.error(f"Error: {e}")

if __name__ == "__main__":
    main()