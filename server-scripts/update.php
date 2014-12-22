<?php
include "config.php";

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
 
$filename = null;

if(isset($_GET["filename"])) {
	
	$filename = html_entity_decode($_GET['filename']);
	
	$command = "java -Durl=$solr_url/$collection_name/update -Dtype=application/json -jar $post_jar $json_folder/$filename.json";
 
	exec($command);

}

echo '{"success":true,"id":"'.$filename.'"}';

?>
