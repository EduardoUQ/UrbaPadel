# UrbaSpace

**UrbaSpace** es una aplicación web para la gestión de reservas de espacios comunitarios en urbanizaciones. Permite administrar pistas de pádel u otros espacios compartidos, controlar disponibilidad, gestionar viviendas y usuarios, aplicar restricciones de uso, bloquear espacios por mantenimiento y centralizar incidencias desde una interfaz sencilla.

La página desplegada puede consultarse en:

[https://urbaspace.page.gd/](https://urbaspace.page.gd/)

## Objetivo del proyecto

El proyecto nace para digitalizar la administración de espacios comunes en comunidades residenciales. Su propósito es sustituir procesos manuales de reserva por una plataforma accesible desde navegador, con separación entre usuarios residentes y administradores de comunidad.

Con UrbaSpace, una comunidad puede:

- Gestionar urbanizaciones, viviendas, administradores y espacios reservables.
- Configurar horarios, duración máxima, límites de reservas y normas de cada espacio.
- Permitir a los residentes consultar disponibilidad y crear reservas.
- Administrar cancelaciones, listas de espera, restricciones y bloqueos temporales.
- Registrar incidencias o comentarios asociados a los espacios.
- Mantener una base de datos centralizada con la información operativa de la comunidad.

## Funcionalidades principales

- **Autenticación de usuarios y administradores** mediante sesiones PHP.
- **Panel de usuario** para consultar espacios, disponibilidad, reservas propias, notificaciones e incidencias.
- **Panel de administración** para gestionar urbanizaciones, viviendas, espacios, administradores y ajustes.
- **Sistema de reservas** con validación de horarios, límites diarios/semanales y disponibilidad.
- **Lista de espera** para espacios con alta demanda.
- **Bloqueos de espacios** por mantenimiento, eventos u otros motivos.
- **Restricciones de uso** aplicables a viviendas concretas.
- **Gestión de incidencias** comunicadas por usuarios y revisadas por administración.
- **Carga y mantenimiento de datos** mediante base de datos MySQL/MariaDB.

## Tecnologías utilizadas

- **HTML5** para la estructura de las vistas.
- **CSS3** para estilos, diseño responsive y adaptación de paneles.
- **JavaScript** para la interacción del frontend y consumo de endpoints.
- **PHP 8** para la lógica del backend, sesiones y conexión con base de datos.
- **MySQL / MariaDB** como sistema de persistencia.
- **Apache** como servidor web recomendado en entorno local.
- **XAMPP** para desarrollo local.

El proyecto no requiere compilación frontend ni dependencias de Node.js. Los archivos HTML, CSS, JavaScript y PHP se sirven directamente desde el servidor.

## Estructura del proyecto

```text
UrbaPadel/
├── database/
│   └── schema.sql
├── src/
│   ├── css/
│   ├── html/
│   ├── img/
│   ├── js/
│   └── php/
│       ├── config/
│       └── db/
├── index.html
└── README.md
```

## Requisitos

- PHP 8.2 o superior con extensión `mysqli`.
- MySQL 8 o MariaDB compatible.
- Servidor web compatible con PHP, como Apache o Nginx.
- Sesiones PHP activas.

## Ejecución local con XAMPP

1. Copia el proyecto dentro de la carpeta `htdocs` de XAMPP.
2. Inicia Apache y MySQL desde el panel de XAMPP.
3. Importa la base de datos desde `database/schema.sql` si todavía no existe.
4. Abre el proyecto en el navegador:

```text
http://localhost/UrbaPadel/UrbaPadel/
```

El archivo `index.html` redirige automáticamente a la pantalla de login.

## Credenciales de demostración

Estas credenciales están pensadas únicamente para pruebas locales o demostraciones:

| Rol | Usuario | Contraseña |
| --- | --- | --- |
| Administrador | `admin@urbanpadel.com` | `admin1234` |
| Usuario | `usuario101` | `usuario101` |
| Usuario | `usuario201` | `usuario201` |

Antes de usar el proyecto en un entorno real, cambia estas credenciales desde el panel de ajustes o directamente en la base de datos.

## Configuración de base de datos

Para entornos de producción, crea un archivo local de configuración:

```text
src/php/config/constantes.local.php
```

Ejemplo de configuración:

```php
<?php

define('DB_HOST', 'sqlXXX.infinityfree.com');
define('DB_USER', 'usuario_db');
define('DB_PASS', 'password_db');
define('DB_NAME', 'nombre_db');
define('DB_CHARSET', 'utf8mb4');
```

El archivo `constantes.local.php` debe mantenerse fuera del control de versiones para evitar exponer credenciales reales.

## Despliegue

La aplicación necesita un hosting con soporte para PHP y MySQL/MariaDB. No es adecuada para plataformas exclusivamente estáticas como GitHub Pages, Netlify o Vercel sin backend PHP.

Pasos generales de despliegue:

1. Crear una base de datos MySQL/MariaDB en el hosting.
2. Importar `database/schema.sql`.
3. Configurar `src/php/config/constantes.local.php` con los datos reales de conexión.
4. Subir el contenido del repositorio a la carpeta pública del servidor.
5. Acceder al dominio configurado.
6. Cambiar las credenciales de demostración.

Versión desplegada:

[https://urbaspace.page.gd/](https://urbaspace.page.gd/)

## Seguridad y uso real

Antes de utilizar la aplicación con datos reales de una comunidad, se recomienda:

- Cambiar todas las contraseñas de demostración.
- Revisar permisos de usuarios y administradores.
- Activar HTTPS en el hosting.
- Realizar copias de seguridad periódicas de la base de datos.
- Revisar la política de privacidad y el tratamiento de datos personales.

## Estado del proyecto

UrbaSpace es un proyecto web funcional orientado a la gestión comunitaria de espacios compartidos. Puede utilizarse como base para una solución real ampliando aspectos como notificaciones por correo, auditoría avanzada, recuperación de contraseña, roles más granulares y mejoras de seguridad adicionales.
