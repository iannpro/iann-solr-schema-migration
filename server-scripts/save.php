<?php
include "config.php";

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$error = false;
 
$content = "";
if(isset($_GET["content"])) {

	$content = html_entity_decode($_GET['content']);	

	try {
		$content_obj = json_decode($content);
	} catch (Exception $e) {
		$error = true;
	}
 
	if (!$error) {	

		$filename = $content_obj->{"id"}.".json";
		$dir = "$json_folder/$filename";
		$myfile = fopen($dir, "w") or die("Unable to open file!");
		fwrite($myfile, $content);
		fclose($myfile);
		
	}
} else {
	$content_obj = json_decode($content);
}

if (!$error) {
	echo '{"success":true,"id":"'.$content_obj->{"id"}.'"}';
}
?>
