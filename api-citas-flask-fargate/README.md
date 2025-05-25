aws ecr create-repository --repository-name api-citas
docker build -t api-citas .
docker tag api-citas 173473165673.dkr.ecr.us-east-1.amazonaws.com/api-citas

Inicializar pass correctamente
sudo apt install pass gnupg2
gpg --gen-key
gpg --list-keys

#pub E29C12BA793DBD0DC52305D8F140DAAA7A8A079E
pass init "tu-id-gpg"



aws ecr get-login-password | docker login --username AWS --password-stdin 173473165673.dkr.ecr.us-east-1.amazonaws.com
docker push 173473165673.dkr.ecr.us-east-1.amazonaws.com/api-citas


Desplegar con Terraform

cd terraform
terraform init
terraform plan
terraform apply


Prueba
curl http://api-citas-lb-2123734072.us-east-1.elb.amazonaws.com/reservas
curl -X POST http://api-citas-lb-2123734072.us-east-1.elb.amazonaws.com/reservas -H "Content-Type: application/json" -d '{"nombre": "Ana", "fecha": "2025-06-10"}'


