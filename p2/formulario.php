<?php

	if ($_SERVER['REQUEST_METHOD'] == 'POST') {		
		//echo "<BR>POST";
		foreach($_POST as $nombre_campo => $valor){
			$asignacion = "\$" . $nombre_campo . "='" . strip_tags($valor) . "';";
			echo "<BR>".$asignacion;
		} 
	}
	else {
		//echo "<BR>GET";
		foreach($_GET as $nombre_campo => $valor){
			$asignacion = "\$" . $nombre_campo . "='" . strip_tags($valor) . "';";
			echo "<BR>".$asignacion;
		} 
	}
?>
