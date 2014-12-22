<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$url = "http://192.168.2.106:8983/solr/iann/select?q=*%3A*&wt=json&indent=true&rows=2147483647";
 
// Get cURL resource
$curl = curl_init();
// Set some options - we are passing in a useragent too here
curl_setopt_array($curl, array(
    CURLOPT_RETURNTRANSFER => 1,
    CURLOPT_URL => $url,
    CURLOPT_USERAGENT => 'Codular Sample cURL Request'
));
// Send the request & save response to $resp
$resp = curl_exec($curl);
// Close request to clear up some resources
curl_close($curl);

print_r($resp);
?>
