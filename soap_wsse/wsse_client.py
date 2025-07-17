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

_logger = logging.getLogger()
_logger.setLevel(logging.INFO)


class SecureWSSE:
    def __init__(self, username, password, signing_key, signing_cert_pem, encrypt_cert_file):
        self.username = username
        self.password = password
        self.signing_key = signing_key
        self.signing_cert_pem = signing_cert_pem
        self.encrypt_cert_file = encrypt_cert_file

    def apply(self, envelope, headers):
        ns = {
            "wsse":"http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd",
            "soapenv": "http://schemas.xmlsoap.org/soap/envelope/",
            "dto": "http://dto.eis.pasarela.hubpagos.bytesw.com/"
        }
        wsse_ns = ns["wsse"]        
        header = envelope.find('soapenv:Header', ns)
        soapenv_ns = ns["soapenv"]
        if header is None:
            header = etree.Element(QName(soapenv_ns,'Header'),ns)
            envelope.insert(0, header)
        # Crear el elemento Security
        security = etree.Element(QName(wsse_ns, "Security"), nsmap=ns)
        header.append(security)
        envelope = self.encrypt_body(envelope)
        envelope = self.sign_body(envelope)                
        envelope = self.add_username_token(envelope)

        header = envelope.find('soapenv:Header',ns)
        security = header.find('wsse:Security',ns)
        encrypted_key = security.find(".//{*}EncryptedKey")  # Busca sin importar el namespace

        if encrypted_key is not None:
            # Remover el nodo de su posición actual
            security.remove(encrypted_key)
            
            # Insertarlo como primer hijo de Security
            security.insert(0, encrypted_key)

        return envelope, headers

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
        

        username_token = etree.SubElement(security, QName(wsse_ns,'UsernameToken'))
        etree.SubElement(username_token, QName(wsse_ns,'Username')).text = self.username
        etree.SubElement(username_token, QName(wsse_ns,'Password')).text = self.password

        nonce = base64.b64encode(os.urandom(16)).decode()
        created = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        etree.SubElement(username_token, QName(wsse_ns,'Nonce')).text = nonce
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

        body = envelope.find('soapenv:Body',ns)
        header = envelope.find('soapenv:Header',ns)
        security = header.find('wsse:Security',ns)
        body.set(QName(wsu_ns,'Id'), 'id-S16n3')  # ID específico o generado        
        xmlsec.tree.add_ids(envelope, ["{"+wsu_ns+"}Id","Id","id"])
        signature_node = xmlsec.template.create(
            envelope,
            xmlsec.Transform.EXCL_C14N,
            xmlsec.Transform.RSA_SHA1,
            ns='ds'
        )
        signature_node.set('Id', 'SIG-123')

        # Personalizar SignedInfo
        signed_info = signature_node.find('.//ds:SignedInfo', ns)        

        # CanonicalizationMethod con InclusiveNamespaces
        canon_method = signed_info.find('.//ds:CanonicalizationMethod', ns)
        etree.SubElement(canon_method, QName(ns['ec'],'InclusiveNamespaces'),            
            PrefixList='dto soapenv',
            nsmap=ns
        )        

        # Añadir Reference personalizada       
        ref = xmlsec.template.add_reference(
            signature_node,
            xmlsec.Transform.SHA1,
            uri='#id-S16n3'  # URI apunta al ID del Body
        )        
        
        transforms = etree.SubElement(
            ref,
            QName(ds,'Transforms'),
            Algorithm=ns['ec']
        )
        transform = etree.SubElement(
            transforms,
            QName(ds,'Transform'),
            Algorithm=ns['ec']
        )
        _logger.info(f"transform: {ET.tostring(transform).decode()}")   
        etree.SubElement(
            transform,
            QName(ns['ec'],'InclusiveNamespaces'),
            PrefixList='dto',
            nsmap=ns
        )
      
        
        # Añadir KeyInfo y SecurityTokenReference (certificado X.509)
        key_info = etree.SubElement(signature_node, '{http://www.w3.org/2000/09/xmldsig#}KeyInfo')
        key_info.set('Id', 'KI-G1')

        transforms = ref.find('.//ds:Transforms', namespaces={'ds': 'http://www.w3.org/2000/09/xmldsig#'})        
        ref.remove(transforms)
        ref.insert(0, transforms)

        _logger.info(f"ref con transform: {ET.tostring(ref).decode()}")

        security_token_ref = etree.SubElement(
            key_info,
            QName(wsse_ns, 'SecurityTokenReference'), 
            {QName(wsu_ns, 'Id'): 'STR-123'}
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
        etree.SubElement(x509_issuer_serial, '{http://www.w3.org/2000/09/xmldsig#}X509IssuerName').text = issuer
        etree.SubElement(x509_issuer_serial, '{http://www.w3.org/2000/09/xmldsig#}X509SerialNumber').text = str(serial)
 

        # Insertar la firma en Security
        security.insert(0, signature_node)        
        
        ctx = xmlsec.SignatureContext()
        key = xmlsec.Key.from_file(self.signing_key, xmlsec.KeyFormat.PEM)        
        key.load_cert_from_file(self.signing_cert_pem, xmlsec.KeyFormat.PEM)
        ctx.key = key
        #header.append(security)        

        try:
            ctx.sign(signature_node)         
        except xmlsec.Error as e:           
            raise type(e)(f"Fallo en firma XML: {e.message}") from e
            
        
        _logger.info(f"envelope signed: {ET.tostring(envelope).decode()}")
        
        return envelope

    def encrypt_body(self, envelope):

        # namespaces relevantes
        ns = {
            "wsse":"http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd",
            "wsu": "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd",
            "wssell" : "http://docs.oasis-open.org/wss/oasis-wss-wssecurity-secext-1.1.xsd",               
            "soapenv": "http://schemas.xmlsoap.org/soap/envelope/",
            'ds': 'http://www.w3.org/2000/09/xmldsig#',
            'ec': 'http://www.w3.org/2001/10/xml-exc-c14n#',
            "dto": "http://dto.eis.pasarela.hubpagos.bytesw.com/"
        }
        wsse_ns = ns["wsse"]
        wssell = ns['wssell']

        body = envelope.find('soapenv:Body', ns)
        header = envelope.find('soapenv:Header', ns)
        security = header.find('wsse:Security', ns)
        #security = etree.Element(QName(wsse_ns, "Security"), nsmap=ns)   
        
        # Generar clave de sesión
        session_key = os.urandom(24)  # 3DES

        # Llaves unicas para EncryptedData y EncryptedKey
        ED_ID = "ED-1"
        EK_ID = "EK-1"

        #print(dir(xmlsec.EncryptionType))

        #_logger.info(f"Transform_atributos: {dir(xmlsec.Transform)}")
        #_logger.info(f"xmlsec.constants: {dir(xmlsec.constants)}")

        # Crear EncryptedKey en el Header
        enc_key = xmlsec.template.add_encrypted_key(
            security,
            xmlsec.Transform.RSA_PKCS1,
            EK_ID
        )
        
        enc_key_chipher = xmlsec.template.encrypted_data_ensure_cipher_value(enc_key)
        
        # Referencia al EncryptedData (body cifrado)
        reference_list = etree.SubElement(enc_key, "{http://www.w3.org/2001/04/xmlenc#}ReferenceList")
        data_ref = etree.SubElement(reference_list, "{http://www.w3.org/2001/04/xmlenc#}DataReference")
        data_ref.set("URI", f"#{ED_ID}")
        enc_key_key_info = xmlsec.template.encrypted_data_ensure_key_info(
            enc_key, 
            None, 
            ns="dsig"
        )
                       
        security_token_ref = etree.SubElement(
            enc_key_key_info,
            QName(wsse_ns,'SecurityTokenReference')
        )

        with open(self.encrypt_cert_file, "rb") as f:
            cert_data = f.read()
        cert = x509.load_pem_x509_certificate(cert_data, default_backend())
        issuer = cert.issuer.rfc4514_string()
        serial = cert.serial_number        

        x509_data = etree.SubElement(security_token_ref, '{http://www.w3.org/2000/09/xmldsig#}X509Data')
        x509_issuer_serial = etree.SubElement(x509_data, '{http://www.w3.org/2000/09/xmldsig#}X509IssuerSerial')
        etree.SubElement(x509_issuer_serial, '{http://www.w3.org/2000/09/xmldsig#}X509IssuerName').text = issuer
        etree.SubElement(x509_issuer_serial, '{http://www.w3.org/2000/09/xmldsig#}X509SerialNumber').text = str(serial)

        public_key = cert.public_key()
        encrypted_session_key = public_key.encrypt(
            session_key,
            padding.PKCS1v15()  # o usar OAEP si lo requiere tu sistema
        )        

        # Namespace mapping para facilitar el uso
        ns = {'ns0': 'http://www.w3.org/2001/04/xmlenc#'}

        # Buscamos el nodo CipherValue
        enc_key_chipher.text = base64.b64encode(encrypted_session_key).decode()
     
        enc_data = xmlsec.template.encrypted_data_create(
            body,
            xmlsec.Transform.DES3,
            type=xmlsec.EncryptionType.CONTENT,
            ns="xenc"
        )

        enc_data.set("Id", ED_ID)
        
        xmlsec.template.encrypted_data_ensure_cipher_value(enc_data)
        
        # --- Reemplazar el contenido del Body con el EncryptedData ---
        content_to_encrypt = list(body)[0]  # el nodo <topsecret>
        _logger.info(f"content_to_encrypt: {ET.tostring(content_to_encrypt).decode()}") 

        # --- Agregar KeyInfo con SecurityTokenReference (referencia a EK-1) ---
        key_info = xmlsec.template.encrypted_data_ensure_key_info(enc_data)
        str_node = etree.SubElement(key_info, "{http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd}SecurityTokenReference")
        str_node.set(QName(wssell, 'TokenType'), "http://docs.oasis-open.org/wss/oasis-wss-soap-message-security-1.1#EncryptedKey")
        ref_node = etree.SubElement(str_node, "{http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd}Reference")
        ref_node.set("URI", f"#{EK_ID}")
        #ref_node.set("ValueType", "http://www.w3.org/2001/04/xmlenc#EncryptedKey")
      

        # --- Cifrar el contenido (EncryptedData) con Des ---        
        enc_ctx_data = xmlsec.EncryptionContext()
        enc_ctx_data.key = xmlsec.Key.from_binary_data(
            xmlsec.constants.KeyDataDes, 
            session_key
        )
        enc_data = enc_ctx_data.encrypt_xml(enc_data, body)
        
        
        _logger.info(f"Envelope after encryption: {ET.tostring(envelope).decode()}")

        return envelope
