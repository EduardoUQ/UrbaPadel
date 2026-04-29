<?php
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

if (!headers_sent()) {
    header('Content-Type: application/json; charset=utf-8');
}

require_once(__DIR__ . '/db/conexion.php');

if (!isset($conexion) || !($conexion instanceof mysqli)) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Error de conexion con la base de datos'
    ]);
    exit;
}

/*
    MODO NORMAL CON LOGIN:
    Descomenta esta linea cuando tengas mergeado el login.
*/
// validarSesionAdmin($conexion);

$funcion = isset($_POST['funcion']) ? $_POST['funcion'] : '';

if ($funcion === 'datosIniciales') {
    datosIniciales($conexion);
} elseif ($funcion === 'guardarViviendas') {
    guardarViviendas($conexion);
} else {
    responder($conexion, 'error', 'Funcion no valida');
}

function validarSesionAdmin($conexion)
{
    if (!isset($_SESSION['rol']) || $_SESSION['rol'] !== 'admin' || !isset($_SESSION['id'])) {
        responder($conexion, 'error', 'Sesion de administrador no valida');
    }

    $idAdmin = (int)$_SESSION['id'];

    $sql = "SELECT id, activo FROM administrador WHERE id = ? LIMIT 1";
    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responder($conexion, 'error', 'Error interno al validar la sesion');
    }

    $stmt->bind_param('i', $idAdmin);
    $stmt->execute();
    $resultado = $stmt->get_result();

    if (!$resultado || $resultado->num_rows === 0) {
        $stmt->close();
        responder($conexion, 'error', 'Sesion de administrador no valida');
    }

    $admin = $resultado->fetch_assoc();
    $stmt->close();

    if (!(bool)$admin['activo']) {
        session_destroy();
        responder($conexion, 'error', 'Cuenta de administrador inactiva');
    }
}

function datosIniciales($conexion)
{
    $idUrbanizacion = obtenerIdUrbanizacion($conexion);
    $urbanizacion = obtenerUrbanizacion($conexion, $idUrbanizacion, true);
    $espacios = obtenerEspaciosUrbanizacion($conexion, $idUrbanizacion);

    $conexion->close();

    echo json_encode([
        'status' => 'success',
        'urbanizacion' => $urbanizacion,
        'espacios' => $espacios
    ]);
    exit;
}

function guardarViviendas($conexion)
{
    $idUrbanizacion = obtenerIdUrbanizacion($conexion);
    obtenerUrbanizacion($conexion, $idUrbanizacion, true);

    $jsonViviendas = isset($_POST['viviendas']) ? $_POST['viviendas'] : '';
    $viviendas = json_decode($jsonViviendas, true);

    if (!is_array($viviendas) || count($viviendas) === 0) {
        responder($conexion, 'error', 'No hay viviendas para guardar');
    }

    if (count($viviendas) > 300) {
        responder($conexion, 'error', 'No puedes importar mas de 300 viviendas de una vez');
    }

    $idsEspaciosValidos = obtenerIdsEspaciosUrbanizacion($conexion, $idUrbanizacion);

    if (count($idsEspaciosValidos) === 0) {
        responder($conexion, 'error', 'Esta urbanizacion no tiene espacios registrados');
    }

    validarViviendasServidor($conexion, $viviendas, $idUrbanizacion, $idsEspaciosValidos);

    $conexion->begin_transaction();

    $viviendasGuardadas = [];
    $emailsEnviados = 0;
    $emailsFallidos = 0;

    foreach ($viviendas as $indice => $vivienda) {
        $idVivienda = isset($vivienda['id']) ? (int)$vivienda['id'] : 0;

        if ($idVivienda > 0) {
            $viviendaGuardada = editarViviendaExistente(
                $conexion,
                $vivienda,
                $idVivienda,
                $idUrbanizacion,
                $idsEspaciosValidos
            );
        } else {
            $viviendaGuardada = crearNuevaVivienda(
                $conexion,
                $vivienda,
                $idUrbanizacion,
                $idsEspaciosValidos
            );

            if (
                enviarEmailCredenciales(
                    $viviendaGuardada['email_notificaciones'],
                    $viviendaGuardada['nombre_usuario'],
                    $viviendaGuardada['password']
                )
            ) {
                $emailsEnviados++;
            } else {
                $emailsFallidos++;
            }
        }

        $viviendasGuardadas[] = $viviendaGuardada;
    }

    $conexion->commit();
    $conexion->close();

    echo json_encode([
        'status' => 'success',
        'message' => 'Viviendas guardadas correctamente',
        'emails_enviados' => $emailsEnviados,
        'emails_fallidos' => $emailsFallidos,
        'viviendas' => $viviendasGuardadas
    ]);
    exit;
}

function crearNuevaVivienda($conexion, $vivienda, $idUrbanizacion, $idsEspaciosValidos)
{
    $datos = normalizarDatosVivienda($vivienda);
    $espaciosPermitidos = obtenerEspaciosPermitidos($vivienda['permisos'], $idsEspaciosValidos);

    $passwdHash = password_hash($datos['password'], PASSWORD_DEFAULT);

    $codigoTemporal = 'TEMP_' . uniqid('', true);
    $usuarioTemporal = 'TEMP_' . uniqid('', true);

    $sqlInsert = "INSERT INTO vivienda (
                    id_urbanizacion,
                    codigo_vivienda,
                    nombre_usuario,
                    passwd_hash,
                    email_notificaciones,
                    telefono_contacto,
                    bloque,
                    portal,
                    escalera,
                    planta,
                    puerta,
                    descripcion_extra,
                    superusuario,
                    activa
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)";

    $stmtInsert = $conexion->prepare($sqlInsert);

    if (!$stmtInsert) {
        responderRollback($conexion, 'error', 'Error interno al preparar la vivienda');
    }

    $stmtInsert->bind_param(
        'isssssssssssi',
        $idUrbanizacion,
        $codigoTemporal,
        $usuarioTemporal,
        $passwdHash,
        $datos['email_notificaciones'],
        $datos['telefono_contacto'],
        $datos['bloque'],
        $datos['portal'],
        $datos['escalera'],
        $datos['planta'],
        $datos['puerta'],
        $datos['descripcion_extra'],
        $datos['superusuario']
    );

    if (!$stmtInsert->execute()) {
        $stmtInsert->close();
        responderRollback($conexion, 'error', 'No se pudo guardar una vivienda nueva');
    }

    $idVivienda = $conexion->insert_id;
    $stmtInsert->close();

    $codigoFinal = 'U' . $idUrbanizacion . 'V' . $idVivienda;
    $nombreUsuarioFinal = $codigoFinal;

    actualizarCodigoUsuario($conexion, $idVivienda, $idUrbanizacion, $codigoFinal, $nombreUsuarioFinal);
    reemplazarPermisos($conexion, $idVivienda, $espaciosPermitidos);

    return crearRespuestaVivienda(
        $idVivienda,
        $idUrbanizacion,
        $codigoFinal,
        $nombreUsuarioFinal,
        $datos,
        $idsEspaciosValidos,
        $espaciosPermitidos
    );
}

function editarViviendaExistente($conexion, $vivienda, $idVivienda, $idUrbanizacion, $idsEspaciosValidos)
{
    if (!existeViviendaEnUrbanizacion($conexion, $idVivienda, $idUrbanizacion)) {
        responderRollback($conexion, 'error', 'Una vivienda no pertenece a esta urbanizacion');
    }

    $datos = normalizarDatosVivienda($vivienda);
    $espaciosPermitidos = obtenerEspaciosPermitidos($vivienda['permisos'], $idsEspaciosValidos);

    $sql = "UPDATE vivienda
            SET email_notificaciones = ?,
                telefono_contacto = ?,
                bloque = ?,
                portal = ?,
                escalera = ?,
                planta = ?,
                puerta = ?,
                descripcion_extra = ?,
                superusuario = ?
            WHERE id = ? AND id_urbanizacion = ?
            LIMIT 1";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responderRollback($conexion, 'error', 'Error interno al editar vivienda');
    }

    $stmt->bind_param(
        'ssssssssiii',
        $datos['email_notificaciones'],
        $datos['telefono_contacto'],
        $datos['bloque'],
        $datos['portal'],
        $datos['escalera'],
        $datos['planta'],
        $datos['puerta'],
        $datos['descripcion_extra'],
        $datos['superusuario'],
        $idVivienda,
        $idUrbanizacion
    );

    if (!$stmt->execute()) {
        $stmt->close();
        responderRollback($conexion, 'error', 'No se pudo editar una vivienda');
    }

    $stmt->close();

    reemplazarPermisos($conexion, $idVivienda, $espaciosPermitidos);

    $identificadores = obtenerIdentificadoresVivienda($conexion, $idVivienda, $idUrbanizacion);

    return crearRespuestaVivienda(
        $idVivienda,
        $idUrbanizacion,
        $identificadores['codigo_vivienda'],
        $identificadores['nombre_usuario'],
        $datos,
        $idsEspaciosValidos,
        $espaciosPermitidos
    );
}

function validarViviendasServidor($conexion, $viviendas, $idUrbanizacion, $idsEspaciosValidos)
{
    $emails = [];
    $passwords = [];

    foreach ($viviendas as $indice => $vivienda) {
        $fila = $indice + 1;
        $idVivienda = isset($vivienda['id']) ? (int)$vivienda['id'] : 0;

        $datos = normalizarDatosVivienda($vivienda);

        if ($datos['email_notificaciones'] === '') {
            responder($conexion, 'error', 'La fila ' . $fila . ' no tiene email');
        }

        if (!filter_var($datos['email_notificaciones'], FILTER_VALIDATE_EMAIL)) {
            responder($conexion, 'error', 'El email de la fila ' . $fila . ' no tiene un formato valido');
        }

        $emailNormalizado = strtolower($datos['email_notificaciones']);

        if (isset($emails[$emailNormalizado])) {
            responder($conexion, 'error', 'El email ' . $datos['email_notificaciones'] . ' esta repetido en el archivo');
        }

        $emails[$emailNormalizado] = true;

        if ($datos['telefono_contacto'] !== '' && !preg_match('/^[0-9]{9}$/', $datos['telefono_contacto'])) {
            responder($conexion, 'error', 'El telefono de la fila ' . $fila . ' debe tener 9 cifras o estar vacio');
        }

        if ($datos['password'] === '') {
            responder($conexion, 'error', 'La fila ' . $fila . ' no tiene password');
        }

        if (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/', $datos['password'])) {
            responder($conexion, 'error', 'La password de la fila ' . $fila . ' debe tener minimo 8 caracteres, mayuscula, minuscula, numero y simbolo');
        }

        if (isset($passwords[$datos['password']])) {
            responder($conexion, 'error', 'La password de la fila ' . $fila . ' esta repetida');
        }

        $passwords[$datos['password']] = true;

        if (strlen($datos['bloque']) > 20) {
            responder($conexion, 'error', 'El bloque de la fila ' . $fila . ' supera los 20 caracteres');
        }

        if (strlen($datos['portal']) > 20) {
            responder($conexion, 'error', 'El portal de la fila ' . $fila . ' supera los 20 caracteres');
        }

        if (strlen($datos['escalera']) > 20) {
            responder($conexion, 'error', 'La escalera de la fila ' . $fila . ' supera los 20 caracteres');
        }

        if (strlen($datos['planta']) > 20) {
            responder($conexion, 'error', 'La planta de la fila ' . $fila . ' supera los 20 caracteres');
        }

        if (strlen($datos['puerta']) > 20) {
            responder($conexion, 'error', 'La puerta de la fila ' . $fila . ' supera los 20 caracteres');
        }

        if (strlen($datos['descripcion_extra']) > 255) {
            responder($conexion, 'error', 'La descripcion de la fila ' . $fila . ' supera los 255 caracteres');
        }

        if (!isset($vivienda['permisos']) || !is_array($vivienda['permisos'])) {
            responder($conexion, 'error', 'La fila ' . $fila . ' no tiene permisos de espacios');
        }

        $espaciosPermitidos = obtenerEspaciosPermitidos($vivienda['permisos'], $idsEspaciosValidos);

        if (count($espaciosPermitidos) === 0) {
            responder($conexion, 'error', 'La fila ' . $fila . ' no tiene ningun espacio permitido');
        }

        if ($idVivienda > 0 && !existeViviendaEnUrbanizacion($conexion, $idVivienda, $idUrbanizacion)) {
            responder($conexion, 'error', 'La vivienda de la fila ' . $fila . ' no pertenece a esta urbanizacion');
        }

        if (emailExisteEnOtraVivienda($conexion, $datos['email_notificaciones'], $idVivienda)) {
            responder($conexion, 'error', 'El email ' . $datos['email_notificaciones'] . ' ya esta asignado a otra vivienda');
        }
    }
}

function normalizarDatosVivienda($vivienda)
{
    return [
        'email_notificaciones' => obtenerValorArray($vivienda, 'email_notificaciones'),
        'telefono_contacto' => obtenerValorArray($vivienda, 'telefono_contacto'),
        'bloque' => obtenerValorArray($vivienda, 'bloque'),
        'portal' => obtenerValorArray($vivienda, 'portal'),
        'escalera' => obtenerValorArray($vivienda, 'escalera'),
        'planta' => obtenerValorArray($vivienda, 'planta'),
        'puerta' => obtenerValorArray($vivienda, 'puerta'),
        'descripcion_extra' => obtenerValorArray($vivienda, 'descripcion_extra'),
        'password' => obtenerValorArray($vivienda, 'password'),
        'superusuario' => !empty($vivienda['superusuario']) ? 1 : 0
    ];
}

function crearRespuestaVivienda($idVivienda, $idUrbanizacion, $codigoFinal, $nombreUsuarioFinal, $datos, $idsEspaciosValidos, $espaciosPermitidos)
{
    return [
        'id' => (int)$idVivienda,
        'id_urbanizacion' => (int)$idUrbanizacion,
        'codigo_vivienda' => $codigoFinal,
        'nombre_usuario' => $nombreUsuarioFinal,
        'password' => $datos['password'],
        'email_notificaciones' => $datos['email_notificaciones'],
        'telefono_contacto' => $datos['telefono_contacto'],
        'bloque' => $datos['bloque'],
        'portal' => $datos['portal'],
        'escalera' => $datos['escalera'],
        'planta' => $datos['planta'],
        'puerta' => $datos['puerta'],
        'descripcion_extra' => $datos['descripcion_extra'],
        'superusuario' => (bool)$datos['superusuario'],
        'activa' => true,
        'permisos' => normalizarPermisosRespuesta($idsEspaciosValidos, $espaciosPermitidos)
    ];
}

function actualizarCodigoUsuario($conexion, $idVivienda, $idUrbanizacion, $codigoFinal, $nombreUsuarioFinal)
{
    $sql = "UPDATE vivienda
            SET codigo_vivienda = ?, nombre_usuario = ?
            WHERE id = ? AND id_urbanizacion = ?
            LIMIT 1";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responderRollback($conexion, 'error', 'Error interno al actualizar codigo de vivienda');
    }

    $stmt->bind_param('ssii', $codigoFinal, $nombreUsuarioFinal, $idVivienda, $idUrbanizacion);

    if (!$stmt->execute()) {
        $stmt->close();
        responderRollback($conexion, 'error', 'No se pudo generar el codigo de vivienda');
    }

    $stmt->close();
}

function reemplazarPermisos($conexion, $idVivienda, $idsEspacios)
{
    $sqlDelete = "DELETE FROM vivienda_espacio_permiso WHERE id_vivienda = ?";
    $stmtDelete = $conexion->prepare($sqlDelete);

    if (!$stmtDelete) {
        responderRollback($conexion, 'error', 'Error interno al limpiar permisos');
    }

    $stmtDelete->bind_param('i', $idVivienda);

    if (!$stmtDelete->execute()) {
        $stmtDelete->close();
        responderRollback($conexion, 'error', 'No se pudieron limpiar los permisos');
    }

    $stmtDelete->close();

    $sqlInsert = "INSERT INTO vivienda_espacio_permiso (id_vivienda, id_espacio, puede_reservar)
                  VALUES (?, ?, 1)";

    $stmtInsert = $conexion->prepare($sqlInsert);

    if (!$stmtInsert) {
        responderRollback($conexion, 'error', 'Error interno al guardar permisos');
    }

    foreach ($idsEspacios as $idEspacio) {
        $stmtInsert->bind_param('ii', $idVivienda, $idEspacio);

        if (!$stmtInsert->execute()) {
            $stmtInsert->close();
            responderRollback($conexion, 'error', 'No se pudieron guardar los permisos');
        }
    }

    $stmtInsert->close();
}

function obtenerEspaciosPermitidos($permisos, $idsEspaciosValidos)
{
    $permitidos = [];

    foreach ($idsEspaciosValidos as $idEspacio) {
        $clave = (string)$idEspacio;

        if (isset($permisos[$clave]) && $permisos[$clave]) {
            $permitidos[] = (int)$idEspacio;
        }
    }

    return $permitidos;
}

function normalizarPermisosRespuesta($idsEspaciosValidos, $espaciosPermitidos)
{
    $respuesta = [];

    foreach ($idsEspaciosValidos as $idEspacio) {
        $respuesta[(string)$idEspacio] = in_array((int)$idEspacio, $espaciosPermitidos, true);
    }

    return $respuesta;
}

function obtenerIdsEspaciosUrbanizacion($conexion, $idUrbanizacion)
{
    $sql = "SELECT id FROM espacio WHERE id_urbanizacion = ? ORDER BY nombre ASC";
    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responder($conexion, 'error', 'Error interno al obtener espacios');
    }

    $stmt->bind_param('i', $idUrbanizacion);
    $stmt->execute();
    $resultado = $stmt->get_result();

    $ids = [];

    while ($fila = $resultado->fetch_assoc()) {
        $ids[] = (int)$fila['id'];
    }

    $stmt->close();

    return $ids;
}

function obtenerEspaciosUrbanizacion($conexion, $idUrbanizacion)
{
    $sql = "SELECT id, nombre, tipo, activo
            FROM espacio
            WHERE id_urbanizacion = ?
            ORDER BY nombre ASC";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responder($conexion, 'error', 'Error interno al obtener espacios');
    }

    $stmt->bind_param('i', $idUrbanizacion);
    $stmt->execute();
    $resultado = $stmt->get_result();

    $espacios = [];

    while ($fila = $resultado->fetch_assoc()) {
        $espacios[] = [
            'id' => (int)$fila['id'],
            'nombre' => $fila['nombre'],
            'tipo' => $fila['tipo'],
            'activo' => (bool)$fila['activo']
        ];
    }

    $stmt->close();

    return $espacios;
}

function obtenerUrbanizacion($conexion, $idUrbanizacion, $debeEstarActiva)
{
    $sql = "SELECT id, nombre, direccion, codigo_postal, municipio, provincia, activo
            FROM urbanizacion
            WHERE id = ?
            LIMIT 1";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responder($conexion, 'error', 'Error interno al obtener la urbanizacion');
    }

    $stmt->bind_param('i', $idUrbanizacion);
    $stmt->execute();
    $resultado = $stmt->get_result();

    if (!$resultado || $resultado->num_rows === 0) {
        $stmt->close();
        responder($conexion, 'error', 'Urbanizacion no encontrada');
    }

    $urbanizacion = $resultado->fetch_assoc();
    $stmt->close();

    if ($debeEstarActiva && !(bool)$urbanizacion['activo']) {
        responder($conexion, 'error', 'La urbanizacion esta inactiva');
    }

    return [
        'id' => (int)$urbanizacion['id'],
        'nombre' => $urbanizacion['nombre'],
        'direccion' => $urbanizacion['direccion'],
        'codigo_postal' => $urbanizacion['codigo_postal'],
        'municipio' => $urbanizacion['municipio'],
        'provincia' => $urbanizacion['provincia'],
        'activo' => (bool)$urbanizacion['activo']
    ];
}

function existeViviendaEnUrbanizacion($conexion, $idVivienda, $idUrbanizacion)
{
    $sql = "SELECT id FROM vivienda WHERE id = ? AND id_urbanizacion = ? LIMIT 1";
    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responder($conexion, 'error', 'Error interno al comprobar vivienda');
    }

    $stmt->bind_param('ii', $idVivienda, $idUrbanizacion);
    $stmt->execute();
    $resultado = $stmt->get_result();

    $existe = $resultado && $resultado->num_rows > 0;

    $stmt->close();

    return $existe;
}

function emailExisteEnOtraVivienda($conexion, $email, $idViviendaActual)
{
    $sql = "SELECT id FROM vivienda
            WHERE email_notificaciones = ?
            AND id <> ?
            LIMIT 1";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responder($conexion, 'error', 'Error interno al comprobar email');
    }

    $stmt->bind_param('si', $email, $idViviendaActual);
    $stmt->execute();
    $resultado = $stmt->get_result();

    $existe = $resultado && $resultado->num_rows > 0;

    $stmt->close();

    return $existe;
}

function obtenerIdentificadoresVivienda($conexion, $idVivienda, $idUrbanizacion)
{
    $sql = "SELECT codigo_vivienda, nombre_usuario
            FROM vivienda
            WHERE id = ? AND id_urbanizacion = ?
            LIMIT 1";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responderRollback($conexion, 'error', 'Error interno al obtener identificadores');
    }

    $stmt->bind_param('ii', $idVivienda, $idUrbanizacion);
    $stmt->execute();
    $resultado = $stmt->get_result();

    if (!$resultado || $resultado->num_rows === 0) {
        $stmt->close();
        responderRollback($conexion, 'error', 'Vivienda no encontrada tras guardar');
    }

    $fila = $resultado->fetch_assoc();
    $stmt->close();

    return [
        'codigo_vivienda' => $fila['codigo_vivienda'],
        'nombre_usuario' => $fila['nombre_usuario']
    ];
}

function obtenerIdUrbanizacion($conexion)
{
    $idUrbanizacion = isset($_POST['idUrbanizacion']) ? (int)$_POST['idUrbanizacion'] : 0;

    if ($idUrbanizacion <= 0) {
        responder($conexion, 'error', 'Urbanizacion no valida');
    }

    return $idUrbanizacion;
}

function obtenerValorArray($array, $clave)
{
    if (!isset($array[$clave])) {
        return '';
    }

    return trim(strip_tags((string)$array[$clave]));
}

function enviarEmailCredenciales($email, $usuario, $password)
{
    $asunto = 'Credenciales de acceso a UrbaPadel';

    $mensaje = "Hola,\n\n";
    $mensaje .= "Se ha creado el acceso de tu vivienda en UrbaPadel.\n\n";
    $mensaje .= "Usuario: " . $usuario . "\n";
    $mensaje .= "Contrasena: " . $password . "\n\n";
    $mensaje .= "Por seguridad, cambia la contrasena tras el primer acceso si la aplicacion lo permite.\n\n";
    $mensaje .= "Un saludo,\n";
    $mensaje .= "UrbaPadel";

    $headers = "From: no-reply@urbapadel.local\r\n";
    $headers .= "Reply-To: no-reply@urbapadel.local\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

    return mail($email, $asunto, $mensaje, $headers);
}

function responderRollback($conexion, $status, $message)
{
    $conexion->rollback();
    responder($conexion, $status, $message);
}

function responder($conexion, $status, $message)
{
    $conexion->close();

    echo json_encode([
        'status' => $status,
        'message' => $message
    ]);

    exit;
}