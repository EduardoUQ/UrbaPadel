<?php

$localConfig = __DIR__ . '/constantes.local.php';

if (file_exists($localConfig)) {
    require $localConfig;
    return;
}

// Configuracion local por defecto
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');
define('DB_NAME', getenv('DB_NAME') ?: 'urbapadel');
define('DB_CHARSET', getenv('DB_CHARSET') ?: 'utf8mb4');
