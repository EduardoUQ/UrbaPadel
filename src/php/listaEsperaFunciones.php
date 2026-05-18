<?php
function adjudicarSiguienteListaEspera($conexion, $idEspacio, $fechaInicio, $fechaFin, $idViviendaExcluir = 0)
{
    $siguiente = obtenerSiguienteEnListaEspera($conexion, $idEspacio, $fechaInicio, $fechaFin, $idViviendaExcluir);

    if (!$siguiente) {
        return false;
    }

    if (hayReservaActivaMismaFranjaLista($conexion, $idEspacio, $fechaInicio, $fechaFin)) {
        return false;
    }

    $idListaEspera = (int)$siguiente['id'];
    $idVivienda = (int)$siguiente['id_vivienda'];

    $conexion->begin_transaction();

    try {
        $sqlReserva = "INSERT INTO reserva 
                            (id_espacio, id_vivienda, fecha_inicio, fecha_fin, estado)
                       VALUES 
                            (?, ?, ?, ?, 'ACTIVA')";

        $stmtReserva = $conexion->prepare($sqlReserva);

        if (!$stmtReserva) {
            throw new Exception('No se pudo preparar la nueva reserva');
        }

        $stmtReserva->bind_param('iiss', $idEspacio, $idVivienda, $fechaInicio, $fechaFin);

        if (!$stmtReserva->execute()) {
            $stmtReserva->close();
            throw new Exception('No se pudo crear la nueva reserva');
        }

        $stmtReserva->close();

        $sqlLista = "UPDATE lista_espera
                     SET estado = 'ATENDIDA'
                     WHERE id = ?";

        $stmtLista = $conexion->prepare($sqlLista);

        if (!$stmtLista) {
            throw new Exception('No se pudo preparar la actualizacion de lista de espera');
        }

        $stmtLista->bind_param('i', $idListaEspera);

        if (!$stmtLista->execute()) {
            $stmtLista->close();
            throw new Exception('No se pudo actualizar la lista de espera');
        }

        $stmtLista->close();

        $conexion->commit();
        return true;
    } catch (Exception $e) {
        $conexion->rollback();
        return false;
    }
}

function obtenerSiguienteEnListaEspera($conexion, $idEspacio, $fechaInicio, $fechaFin, $idViviendaExcluir = 0)
{
    $sql = "SELECT id, id_vivienda
            FROM lista_espera
            WHERE id_espacio = ?
                AND fecha_inicio_deseada = ?
                AND fecha_fin_deseada = ?
                AND estado = 'EN_ESPERA'
                AND id_vivienda <> ?
            ORDER BY posicion ASC, fecha_solicitud ASC
            LIMIT 1";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        return null;
    }

    $stmt->bind_param('issi', $idEspacio, $fechaInicio, $fechaFin, $idViviendaExcluir);
    $stmt->execute();
    $resultado = $stmt->get_result();

    if (!$resultado || $resultado->num_rows === 0) {
        $stmt->close();
        return null;
    }

    $fila = $resultado->fetch_assoc();
    $stmt->close();

    return $fila;
}

function hayReservaActivaMismaFranjaLista($conexion, $idEspacio, $fechaInicio, $fechaFin)
{
    $sql = "SELECT id
            FROM reserva
            WHERE id_espacio = ?
                AND estado = 'ACTIVA'
                AND fecha_inicio < ?
                AND fecha_fin > ?
            LIMIT 1";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        return true;
    }

    $stmt->bind_param('iss', $idEspacio, $fechaFin, $fechaInicio);
    $stmt->execute();
    $resultado = $stmt->get_result();

    $existe = $resultado && $resultado->num_rows > 0;

    $stmt->close();

    return $existe;
}