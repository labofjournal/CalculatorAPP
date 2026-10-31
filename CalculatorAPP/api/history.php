<?php
/**
 * Endpoint status untuk instalasi PHP lokal.
 * Sinkronisasi riwayat akun dilakukan langsung ke Cloud Firestore dari js/app.js.
 * Endpoint ini sengaja tidak menerima data akun/kata sandi dan tidak menulis
 * riwayat bersama ke berkas JSON yang dapat dibaca pengguna lain.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    header('Allow: GET');
    echo json_encode(['ok' => false, 'message' => 'Method not allowed.']);
    exit;
}

$seedFile = __DIR__ . '/history.json';
$seed = is_file($seedFile) ? json_decode(file_get_contents($seedFile), true) : ['items' => []];
if (!is_array($seed)) $seed = ['items' => []];

echo json_encode([
    'ok' => true,
    'service' => 'CalculatorAPP History API',
    'storage' => 'Cloud Firestore per-user (authenticated) / browser localStorage (guest)',
    'seed' => $seed
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
