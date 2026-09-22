<?php
require_once __DIR__ . '/../includes/response.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$_SESSION = [];
session_destroy();

respond(['success' => true]);
