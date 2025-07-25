import logging
from lxml import etree
import base64
from datetime import datetime, timezone
import os
import xml.etree.ElementTree as ET
import xmlsec
from lxml.etree import QName
from cryptography import x509
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import serialization
import secrets
from cryptography.hazmat.primitives import serialization

_logger = logging.getLogger()
_logger.setLevel(logging.INFO)

def random_serial(bits=128):
        """
        Genera un número de serie aleatorio
        RFC 5280 recomienda máximo 160 bits, común usar 128 bits
        """
        # Generar bytes aleatorios criptográficamente seguros
        random_bytes = secrets.randbits(bits)
        
        # Asegurar que sea positivo (MSB = 0 para certificados)
        if bits % 8 == 0:
            # Para múltiplos de 8, asegurar que el primer bit sea 0
            mask = (1 << (bits - 1)) - 1
            random_bytes &= mask
        
        hex_serial = format(random_bytes, f'0{bits//4}X')
        return hex_serial


class SecureWSSE:
    def __init__(self, username, password, signing_cert_pem, encrypt_cert_file):
        self.username = username
        self.password = password
        self.signing_cert_pem = signing_cert_pem
        self.encrypt_cert_file = encrypt_cert_file

    def apply(self, envelope, headers):
        ns = {
            "wsse":"http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd",
            "soapenv": "http://schemas.xmlsoap.org/soap/envelope/",
            "dto": "http://dto.eis.pasarela.hubpagos.bytesw.com/",
            'ds': "http://www.w3.org/2000/09/xmldsig#",
            'xenc': "http://www.w3.org/2001/04/xmlenc#",
            "wsu": "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd"
        }

        wsse_ns = ns["wsse"]        
        header = envelope.find('soapenv:Header', ns)
        soapenv_ns = ns["soapenv"]
        if header is None:
            header = etree.Element(QName(soapenv_ns,'Header'),ns)
            envelope.insert(0, header)
        # Crear el elemento Security
        security_nsmap = {
            'wsse': ns["wsse"],
            'wsu': ns["wsu"],
            'xenc': ns["xenc"]
        }
        security = etree.Element(QName(wsse_ns, "Security"), nsmap=security_nsmap)

        header.append(security)
        envelope = self.add_username_token(envelope)           
        envelope = self.sign_body(envelope)
        envelope = self.encrypt_body(envelope)

        header = envelope.find('soapenv:Header',ns)
        security = header.find('wsse:Security',ns)
        encrypted_key = security.find(".//{*}EncryptedKey")  # Busca sin importar el namespace

        if encrypted_key is not None:
            # Remover el nodo de su posición actual
            security.remove(encrypted_key)
            
            # Insertarlo como primer hijo de Security
            security.insert(0, encrypted_key)
        
        return envelope, headers

    def get_public_key_from_certificate(self):
        """Extrae la clave pública del certificado en tiempo de ejecución"""
        try:
            # Leer el certificado
            with open(self.encrypt_cert_file, 'rb') as cert_file:
                cert_data = cert_file.read()
            
            # Cargar el certificado
            certificate = x509.load_pem_x509_certificate(cert_data)
            issuer = certificate.issuer.rfc4514_string()
            serial = certificate.serial_number

            # Extraer la clave pública
            public_key = certificate.public_key()
            
            # Serializar la clave pública a PEM
            public_key_pem = public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            )
            
            return public_key_pem, public_key, issuer, serial
            
        except Exception as e:
            raise Exception(f"Error extrayendo clave pública del certificado: {e}")
    
    def generate_session_key(self, key_size=192):
        """Genera una clave AES aleatoria y devuelve tanto la clave como el objeto xmlsec"""
        # Generar bytes aleatorios para la clave AES
        key_size_bytes = key_size // 8  # 128 bits = 16 bytes
        session_key_bytes = secrets.token_bytes(key_size_bytes)
        
        # Crear clave xmlsec desde los bytes
        xmlsec_key = xmlsec.Key.from_binary_data(
            xmlsec.constants.KeyDataDes,
            session_key_bytes
        )
        
        return session_key_bytes, xmlsec_key
    
    def encrypt_session_key_with_rsa(self, session_key_bytes):
        """Encripta la clave de sesión con la clave pública RSA del certificado"""
        try:
            # Cargar el certificado
            with open(self.encrypt_cert_file, 'rb') as cert_file:
                cert_data = cert_file.read()
            
            certificate = x509.load_pem_x509_certificate(cert_data)
            public_key = certificate.public_key()
            
            # Encriptar la clave de sesión con RSA-PKCS1v15 (como en el XML)
            encrypted_key = public_key.encrypt(
                session_key_bytes,
                padding.PKCS1v15()  # Corresponde a "rsa-1_5" en el XML
            )
            
            # Codificar a Base64 para el CipherValue
            cipher_value = base64.b64encode(encrypted_key).decode('utf-8')
            
            return cipher_value, encrypted_key
            
        except Exception as e:
            raise Exception(f"Error encriptando clave de sesión: {e}")
    
    def add_username_token(self, envelope):
        
        ns = {
            "wsse":"http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd",
            "wsu": "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd",
            "soapenv": "http://schemas.xmlsoap.org/soap/envelope/",
            "dto": "http://dto.eis.pasarela.hubpagos.bytesw.com/"
        }

        header = envelope.find('soapenv:Header',ns)
        security = header.find('wsse:Security',ns)

        wsse_ns = ns["wsse"]
        wsu_ns = ns["wsu"]
        
        token_id = f"UsernameToken-{random_serial()}"

        username_token = etree.SubElement(security, QName(wsse_ns,'UsernameToken'))
        username_token.set(QName(wsu_ns,'Id'), token_id)
        etree.SubElement(username_token, QName(wsse_ns,'Username')).text = self.username
        password_elem = etree.SubElement(username_token, QName(wsse_ns,'Password'))
        password_elem.set('Type', 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText')
        password_elem.text = self.password

        nonce = base64.b64encode(os.urandom(16)).decode()
        created = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"

        nonce_elem = etree.SubElement(username_token, QName(wsse_ns,'Nonce'))
        nonce_elem.set('EncodingType', 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary')
        nonce_elem.text = nonce
        etree.SubElement(username_token, QName(wsu_ns,'Created')).text = created       

        #_logger.info(f"Security Header add_username_token: {ET.tostring(security).decode()}")
        return envelope

    def sign_body(self, envelope):

        # namespaces relevantes
        ns = {
            "wsse":"http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd",
            "wsu": "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd",
            "soapenv": "http://schemas.xmlsoap.org/soap/envelope/",
            'ds': 'http://www.w3.org/2000/09/xmldsig#',
            'ec': 'http://www.w3.org/2001/10/xml-exc-c14n#',
            "dto": "http://dto.eis.pasarela.hubpagos.bytesw.com/"
        }
        wsse_ns = ns["wsse"]
        wsu_ns = ns["wsu"]
        ds = ns['ds'] 

        #xmlsec.enable_debug_trace(True)
        id_signature = random_serial()

        body = envelope.find('soapenv:Body',ns)
        header = envelope.find('soapenv:Header',ns)
        security = header.find('wsse:Security',ns)        
        
        body.set('{http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd}Id', f'id-{id_signature}')   
        xmlsec.tree.add_ids(envelope, ["{"+wsu_ns+"}Id","Id","id"])
        signature_node = xmlsec.template.create(
            envelope,
            xmlsec.Transform.EXCL_C14N,
            xmlsec.Transform.RSA_SHA1,
            ns='ds'
        )
        
        signature_node.set('Id', f"SIG-{random_serial()}") 

        # Personalizar SignedInfo
        signed_info = signature_node.find('.//ds:SignedInfo', ns)        

        # CanonicalizationMethod con InclusiveNamespaces
        canon_method = signed_info.find('.//ds:CanonicalizationMethod', ns)
        etree.SubElement(canon_method, 
            QName(ns['ec'],'InclusiveNamespaces'),     
            PrefixList='dto soapenv',
            nsmap=ns    
        )        

        # Añadir Reference personalizada       
        ref = xmlsec.template.add_reference(
            signature_node,
            xmlsec.Transform.SHA1,
            uri=f'#id-{id_signature}'  # URI apunta al ID del Body
        )        
        
        transforms = etree.SubElement(
            ref,
            QName(ds,'Transforms')
        )
        transform = etree.SubElement(
            transforms,
            QName(ds,'Transform')
        )
        transform.set('Algorithm', ns['ec'])  
        
        etree.SubElement(
            transform,
            QName(ns['ec'],'InclusiveNamespaces'),
            PrefixList='dto',
            nsmap=ns
        )

        # Añadir KeyInfo con SecurityTokenReference
        key_info = etree.SubElement(signature_node, '{http://www.w3.org/2000/09/xmldsig#}KeyInfo')
        key_info.set('Id', f'KI-{random_serial()}')

        transforms = ref.find('.//ds:Transforms', namespaces={'ds': 'http://www.w3.org/2000/09/xmldsig#'})        
        ref.remove(transforms)
        ref.insert(0, transforms)

        _logger.info(f"ref con transform: {ET.tostring(ref).decode()}")

        security_token_ref = etree.SubElement(
            key_info,
            QName(wsse_ns, 'SecurityTokenReference'), 
            {QName(wsu_ns, 'Id'): f'STR-{random_serial()}'}
        )        
        

        with open(self.signing_cert_pem, "rb") as f:
            cert_data = f.read()
        cert = x509.load_pem_x509_certificate(cert_data, default_backend())
        issuer = cert.issuer.rfc4514_string()
        serial = cert.serial_number
        _logger.info(f"Cert issuer: {issuer}")
        _logger.info(f"Cert serial: {serial}")

        x509_data = etree.SubElement(security_token_ref, QName(ds,'X509Data'))
        x509_issuer_serial = etree.SubElement(x509_data, QName(ds,'X509IssuerSerial'))        
        etree.SubElement(x509_issuer_serial, QName(ds,'X509IssuerName')).text = issuer
        etree.SubElement(x509_issuer_serial, QName(ds,'X509SerialNumber')).text = str(serial)
 

        # Insertar la firma en Security
        security.insert(0, signature_node)        
        
        ctx = xmlsec.SignatureContext()
        key = xmlsec.Key.from_file(self.signing_cert_pem, xmlsec.KeyFormat.PEM)        
        #key.load_cert_from_file(self.signing_cert_pem, xmlsec.KeyFormat.PEM)
        ctx.key = key
        
        try:
            ctx.sign(signature_node)         
        except xmlsec.Error as e:           
            raise type(e)(f"Fallo en firma XML: {e.message}") from e
        
        
        _logger.info(f"envelope signed: {ET.tostring(envelope).decode()}")
        
        return envelope

    def encrypt_body(self, envelope):

        # Habilitar debugging de xmlsec
        xmlsec.enable_debug_trace(True)
        
        # namespaces relevantes
        ns = {
            "wsse":"http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd",
            "wsu": "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd",
            "wssell" : "http://docs.oasis-open.org/wss/oasis-wss-wssecurity-secext-1.1.xsd",               
            "soapenv": "http://schemas.xmlsoap.org/soap/envelope/",
            'ds': 'http://www.w3.org/2000/09/xmldsig#',
            'ec': 'http://www.w3.org/2001/10/xml-exc-c14n#',
            "dto": "http://dto.eis.pasarela.hubpagos.bytesw.com/",
            'xenc': "http://www.w3.org/2001/04/xmlenc#"
        }
        wsse_ns = ns["wsse"]
        wssell = ns['wssell']
        ds = ns['ds']

        body = envelope.find('soapenv:Body', ns)
        header = envelope.find('soapenv:Header', ns)
        security = header.find('wsse:Security', ns)
        
        # Llaves unicas para EncryptedData y EncryptedKey
        ED_ID = f"ED-{random_serial()}"
        EK_ID = f"EK-{random_serial()}"

        # Crear EncryptedKey en el Header
        enc_key = xmlsec.template.add_encrypted_key(
            security,
            xmlsec.Transform.RSA_PKCS1,
            EK_ID
        )
        
        # Referencia al EncryptedData (body cifrado)
        reference_list = etree.SubElement(enc_key, "{http://www.w3.org/2001/04/xmlenc#}ReferenceList")
        data_ref = etree.SubElement(reference_list, "{http://www.w3.org/2001/04/xmlenc#}DataReference")
        data_ref.set("URI", f"#{ED_ID}")
        enc_key_key_info = xmlsec.template.encrypted_data_ensure_key_info(
            enc_key, 
            None, 
            ns="ds"
        )
                       
        security_token_ref = etree.SubElement(
            enc_key_key_info,
            QName(wsse_ns,'SecurityTokenReference')
        )

        public_key_pem, public_key, issuer, serial = self.get_public_key_from_certificate()

        x509_data = etree.SubElement(security_token_ref, '{http://www.w3.org/2000/09/xmldsig#}X509Data')
        x509_issuer_serial = etree.SubElement(x509_data, '{http://www.w3.org/2000/09/xmldsig#}X509IssuerSerial')        
        etree.SubElement(x509_issuer_serial, QName(ds,'X509IssuerName')).text = issuer
        etree.SubElement(x509_issuer_serial, QName(ds,'X509SerialNumber')).text = str(serial)

        
        ######### Sección de cifrado del Body #########
        
        manager = xmlsec.KeysManager()

        # Crear clave desde los datos PEM        
        key = xmlsec.Key.from_binary_data(
            xmlsec.constants.KeyDataDes,
            public_key_pem
        )
        manager.add_key(key)
        enc_ctx_data = xmlsec.EncryptionContext(manager)
        # 1. Generar clave de sesión manualmente
        session_key_bytes, xmlsec_session_key = self.generate_session_key(192)
        enc_ctx_data.key = xmlsec_session_key

        """# Generar una clave de sesión para el cifrado con xmlsec
        enc_ctx_data.key = xmlsec.Key.generate(
            xmlsec.constants.KeyDataDes, 
            192, 
            xmlsec.constants.KeyDataTypeSession
        )"""

        # 2. Encriptar la clave con RSA
        cipher_value, encrypted_key_bytes = self.encrypt_session_key_with_rsa(session_key_bytes)

        # Asegurar que la clave de sesión esté en el EncryptedData
        enc_key_chipher = xmlsec.template.encrypted_data_ensure_cipher_value(enc_key)

        # Buscamos el nodo CipherValue
        enc_key_chipher.text = cipher_value
     
        enc_data = xmlsec.template.encrypted_data_create(
            body,
            xmlsec.Transform.DES3,
            type=xmlsec.EncryptionType.CONTENT,
            ns="xenc"
        )

        enc_data.set("Id", ED_ID)
        
        xmlsec.template.encrypted_data_ensure_cipher_value(enc_data)        
        
        #####Cifrar el contenido (EncryptedData) con Des #####
        content_to_encrypt = list(body)[0]  # el nodo <topsecret>
        _logger.info(f"content_to_encrypt: {ET.tostring(content_to_encrypt).decode()}") 
        enc_data = enc_ctx_data.encrypt_xml(enc_data, body)

        key_info_nsmap = {
            'ds': ns["ds"]
        }
        
        key_info = etree.SubElement(
            enc_data,
            QName(ds, 'KeyInfo'),
            nsmap=key_info_nsmap
        )

        security_token_ref_nsmap = {
            'wsse': ns["wsse"],
            'wsse11': ns['wssell']
        }

        security_token_ref2 = etree.SubElement(
            key_info,
            QName(wsse_ns,'SecurityTokenReference'),
            nsmap=security_token_ref_nsmap
        )

        
             
        security_token_ref2.set(QName(wssell, 'TokenType'), "http://docs.oasis-open.org/wss/oasis-wss-soap-message-security-1.1#EncryptedKey")
        ref_node = etree.SubElement(security_token_ref2, QName(wsse_ns,'Reference'))
        ref_node.set("URI", f"#{EK_ID}")

        #Ubicar keyInfo en el orden esperado por el backend
        key_info = enc_data.find('.//ds:KeyInfo', ns)
        encryption_method = enc_data.find('.//xenc:EncryptionMethod', ns)

        # Remover KeyInfo de su posición actual
        key_info.getparent().remove(key_info)
            
        # Encontrar la posición del EncryptionMethod
        parent = encryption_method.getparent()
        encryption_method_index = list(parent).index(encryption_method)
            
        # Insertar KeyInfo después del EncryptionMethod
        parent.insert(encryption_method_index + 1, key_info)
                
        _logger.info(f"Envelope after encryption: {ET.tostring(envelope).decode()}")

        return envelope
