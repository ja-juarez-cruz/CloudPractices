package java;
import java.io.*;
import java.security.*;
import java.security.cert.Certificate;
import java.security.cert.X509Certificate;
import java.util.Base64;

public class ExportKeystore {
    public static void main(String[] args) {
        if (args.length < 3) {
            System.out.println("Uso: java ExportKeystore <keystore> <alias> <keystorePassword> [keyPassword]");
            return;
        }
        
        String keystorePath = args[0];
        String alias = args[1];
        String keystorePassword = args[2];
        String keyPassword = args.length > 3 ? args[3] : keystorePassword;
        
        try {
            // Cargar el keystore
            KeyStore keyStore = KeyStore.getInstance("PKCS12");
            FileInputStream fis = new FileInputStream(keystorePath);
            keyStore.load(fis, keystorePassword.toCharArray());
            fis.close();
            
            // Intentar obtener la clave privada con diferentes contraseñas
            PrivateKey privateKey = null;
            String[] passwordsToTry = {keyPassword, keystorePassword, "", "changeit"};
            
            for (String pwd : passwordsToTry) {
                try {
                    privateKey = (PrivateKey) keyStore.getKey(alias, pwd.toCharArray());
                    System.out.println("Clave privada obtenida con contraseña: " + (pwd.isEmpty() ? "[vacía]" : "[proporcionada]"));
                    break;
                } catch (Exception e) {
                    System.out.println("Falló con contraseña: " + (pwd.isEmpty() ? "[vacía]" : "[proporcionada]"));
                }
            }
            
            if (privateKey == null) {
                throw new Exception("No se pudo obtener la clave privada con ninguna contraseña probada");
            }
            
            // Obtener el certificado
            Certificate cert = keyStore.getCertificate(alias);
            
            // Crear archivo PEM
            FileWriter writer = new FileWriter("banco-private_cert.pem");
            
            // Escribir clave privada
            writer.write("-----BEGIN PRIVATE KEY-----\n");
            String privateKeyBase64 = Base64.getEncoder().encodeToString(privateKey.getEncoded());
            for (int i = 0; i < privateKeyBase64.length(); i += 64) {
                int end = Math.min(i + 64, privateKeyBase64.length());
                writer.write(privateKeyBase64.substring(i, end) + "\n");
            }
            writer.write("-----END PRIVATE KEY-----\n");
            
            // Escribir certificado
            writer.write("-----BEGIN CERTIFICATE-----\n");
            String certBase64 = Base64.getEncoder().encodeToString(cert.getEncoded());
            for (int i = 0; i < certBase64.length(); i += 64) {
                int end = Math.min(i + 64, certBase64.length());
                writer.write(certBase64.substring(i, end) + "\n");
            }
            writer.write("-----END CERTIFICATE-----\n");
            
            writer.close();
            System.out.println("Archivo banco-private_cert.pem creado exitosamente");
            
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}