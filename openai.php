<?php
// openai.php

header('Content-Type: application/json');

$apiKey = file_get_contents(__DIR__ . '/../apis/openai.txt');

if ($apiKey === FALSE) {
    echo json_encode(['error' => 'Unable to retrieve API key']);
} else {
    echo json_encode(['apiKey' => $apiKey]);
}
?>