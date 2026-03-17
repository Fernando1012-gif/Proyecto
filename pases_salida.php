<?php
header('Content-Type: application/json');
$pedo= new PDO('mysql: dbname=sistema_permisos_salidas; host:127.0.0.1,', 'root','');
//Seleccionar los eventos
$sentenciaSQL= $pdo-> prepare('SELECT * FROM permisos_goce');
$sentenciaSQL -> execute();

$resultado = $sentenciaSQL-> fetchALL(PDO::FETCH_ASSOC);
echo  json_encode($resultado);

?>