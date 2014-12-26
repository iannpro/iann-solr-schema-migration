<?php
include "config.php";

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

if(isset($_GET["filename"])) {
	
	$filename = html_entity_decode($_GET['filename']);
	$dir = "$json_folder/$filename.json";
	//$filename = "7d734010-655a-43de-9421-c72789c1876f";
	//$dir = "./json/$filename.json";

	$cacheddir = "$json_folder/cached/$filename.json";
	$myfile = fopen($dir, "r") or die("Unable to open file!");
	$content = fread($myfile, filesize($dir));
	$content = preg_replace('/\s+/', ' ', trim($content));
        fclose($myfile);
	
	$output = '{"add":{"commitWithin":500,"doc":'.$content.'}}';

	$writefile = fopen($cacheddir, "w") or die("Unable to open file!");
        fwrite($writefile, $output);
        fclose($writefile);
	
	$command = "java -Durl=$solr_url/$collection_name/update -Dtype=application/json -jar $post_jar $cacheddir";
 
	exec($command);

}

//echo '{"success":true,"id":"'.$filename.'"}';

?>
