-- Asegurar que opciones avanzadas estén activadas
-- Habilita las opciones avanzadas de configuración del sistema (sp_configure) 
-- que están ocultas por defecto.
EXEC sp_configure 'show advanced options', 1;
RECONFIGURE;

-- Permite el acceso remoto a la instancia de SQL Server. 
-- Esencial en un contenedor o EC2 si quieres conectarte desde un cliente externo 
-- (por ejemplo, desde una Lambda, tu máquina local o una app web).
EXEC sp_configure 'remote access', 1;
RECONFIGURE;

-- Crear login SQL dinámico
-- Crea un login de SQL Server con usuario y contraseña 
-- (modo autenticación SQL, no Windows).
CREATE LOGIN {{SQL_USER}} WITH PASSWORD = '{{SQL_PASSWORD}}';

--Asocia el login creado con un usuario de base de datos.
-- En SQL Server, el login permite entrar al servidor, 
-- pero necesitas un USER para acceder a una base de datos específica.
CREATE USER {{SQL_USER}} FOR LOGIN {{SQL_USER}};

-- puede hacer SELECT sobre todas las tablas.
EXEC sp_addrolemember 'db_datareader', '{{SQL_USER}}';

-- puede hacer INSERT, UPDATE, DELETE. sobre todas las tablas.
EXEC sp_addrolemember 'db_datawriter', '{{SQL_USER}}';