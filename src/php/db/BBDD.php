<?php
require_once __DIR__ . '/../config/constantes.php';

// Conectar sin seleccionar BD
$conexion = new mysqli(DB_HOST, DB_USER, DB_PASS);
if ($conexion->connect_error) {
    die("Error de conexión: " . $conexion->connect_error);
}
$conexion->set_charset(DB_CHARSET);

// Comprobar si la BD ya existe
$sql = "SHOW DATABASES LIKE '" . DB_NAME . "'";
$comprobar = $conexion->query($sql);

if (!$comprobar) {
    die("Error al comprobar la base de datos: " . $conexion->error);
}

if ($comprobar->num_rows > 0) {
    die("La base de datos '" . DB_NAME . "' ya existe. Instalación cancelada para evitar sobreescritura.");
}

// Crear BD
$sql = "CREATE DATABASE " . DB_NAME . " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";
$conexion->query($sql) or die("Error al crear la base de datos: " . $conexion->error);

$conexion->select_db(DB_NAME);

// Hash contraseña admin
$hashAdmin = password_hash('admin1234', PASSWORD_DEFAULT);

// Crear tablas
$sql = "
CREATE TABLE administrador (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    passwd_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    super_admin BOOLEAN NOT NULL DEFAULT TRUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE urbanizacion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    direccion VARCHAR(255) NOT NULL,
    codigo_postal VARCHAR(10) NOT NULL,
    municipio VARCHAR(100) NOT NULL,
    provincia VARCHAR(100) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE vivienda (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_urbanizacion INT NOT NULL,
    codigo_vivienda VARCHAR(50) NOT NULL UNIQUE,
    nombre_usuario VARCHAR(50) NOT NULL UNIQUE,
    passwd_hash VARCHAR(255) NOT NULL,
    email_notificaciones VARCHAR(255) NOT NULL,
    telefono_contacto VARCHAR(20) NULL,
    bloque VARCHAR(20) NULL,
    portal VARCHAR(20) NULL,
    escalera VARCHAR(20) NULL,
    planta VARCHAR(20) NULL,
    puerta VARCHAR(20) NULL,
    descripcion_extra VARCHAR(255) NULL,
    superusuario BOOLEAN NOT NULL DEFAULT FALSE,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_urbanizacion) REFERENCES urbanizacion(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE espacio (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_urbanizacion INT NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    tipo VARCHAR(100) NOT NULL,
    descripcion TEXT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_urbanizacion) REFERENCES urbanizacion(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE espacio_configuracion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_espacio INT NOT NULL UNIQUE,
    hora_apertura TIME NOT NULL,
    hora_cierre TIME NOT NULL,
    unidad_reserva ENUM('30_MIN','60_MIN','1_DIA') NOT NULL,
    duracion_maxima_minutos INT NOT NULL,
    max_reservas_dia INT NOT NULL DEFAULT 1,
    max_reservas_semana INT NOT NULL DEFAULT 7,
    max_dias_anticipacion INT NOT NULL DEFAULT 30,
    minutos_entre_reservas INT NOT NULL DEFAULT 0,
    permite_lista_espera BOOLEAN NOT NULL DEFAULT TRUE,
    permite_cancelacion BOOLEAN NOT NULL DEFAULT TRUE,
    minutos_limite_cancelacion INT NOT NULL DEFAULT 60,
    normas_texto TEXT NULL,
    FOREIGN KEY (id_espacio) REFERENCES espacio(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE vivienda_espacio_permiso (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_vivienda INT NOT NULL,
    id_espacio INT NOT NULL,
    puede_reservar BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (id_vivienda, id_espacio),
    FOREIGN KEY (id_vivienda) REFERENCES vivienda(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (id_espacio) REFERENCES espacio(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE reserva (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_espacio INT NOT NULL,
    id_vivienda INT NOT NULL,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME NOT NULL,
    estado ENUM('ACTIVA','CANCELADA','FINALIZADA') NOT NULL DEFAULT 'ACTIVA',
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_cancelacion DATETIME NULL,
    FOREIGN KEY (id_espacio) REFERENCES espacio(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (id_vivienda) REFERENCES vivienda(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE lista_espera (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_espacio INT NOT NULL,
    id_vivienda INT NOT NULL,
    fecha_inicio_deseada DATETIME NOT NULL,
    fecha_fin_deseada DATETIME NOT NULL,
    posicion INT NOT NULL,
    estado ENUM('EN_ESPERA','ATENDIDA','CANCELADA') NOT NULL DEFAULT 'EN_ESPERA',
    fecha_solicitud DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_espacio) REFERENCES espacio(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (id_vivienda) REFERENCES vivienda(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE restriccion_uso (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_vivienda INT NOT NULL,
    id_espacio INT NOT NULL,
    motivo VARCHAR(255) NOT NULL,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME NULL,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    creada_por_tipo ENUM('ADMIN','SUPERUSUARIO') NOT NULL,
    creada_por_id INT NOT NULL,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_vivienda) REFERENCES vivienda(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (id_espacio) REFERENCES espacio(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE bloqueo_espacio (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_espacio INT NOT NULL,
    motivo VARCHAR(255) NOT NULL,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_por_tipo ENUM('ADMIN','SUPERUSUARIO') NOT NULL,
    creado_por_id INT NOT NULL,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_espacio) REFERENCES espacio(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE comentario_espacio (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_espacio INT NOT NULL,
    id_vivienda INT NOT NULL,
    comentario TEXT NOT NULL,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    visible BOOLEAN NOT NULL DEFAULT TRUE,
    resuelto BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (id_espacio) REFERENCES espacio(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (id_vivienda) REFERENCES vivienda(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO administrador (email, passwd_hash, nombre)
VALUES ('admin@urbanpadel.com', '$hashAdmin', 'Administrador Principal');
";

if ($conexion->multi_query($sql)) {
    while ($conexion->next_result()) {;}
} else {
    die("Error ejecutando multi_query: " . $conexion->error);
}

$conexion->close();
?>