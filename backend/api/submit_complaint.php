<?php
/**
 * نقطة عامة (بدون تسجيل دخول) تستقبل شكاوى صفحة الهبوط العامة (مخيم الصقر).
 */

require_once __DIR__ . '/../includes/response.php';
require_once __DIR__ . '/../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond_error('طريقة غير مسموحة', 405);
}

$input = json_input();

$name    = trim($input['name'] ?? '');
$phone   = trim($input['phone'] ?? '');
$type    = trim($input['type'] ?? '');
$message = trim($input['message'] ?? '');

if ($name === '' || $phone === '' || $message === '') {
    respond_error('الاسم ورقم الهاتف وتفاصيل الشكوى مطلوبين', 422);
}

$stmt = $pdo->prepare('INSERT INTO complaints (name, phone, type, message) VALUES (?, ?, ?, ?)');
$stmt->execute([$name, $phone, $type ?: 'موضوع آخر', $message]);

respond(['success' => true], 201);
