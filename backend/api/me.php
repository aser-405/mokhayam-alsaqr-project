<?php
require_once __DIR__ . '/../includes/response.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_login();

$stmt = $pdo->prepare('SELECT id, name, email, role FROM users WHERE id = ? LIMIT 1');
$stmt->execute([current_user_id()]);
$user = $stmt->fetch();

if (!$user) {
    respond_error('المستخدم غير موجود', 404);
}

$allowedPages = $user['role'] === 'مدير' ? null : get_data_entry_allowed_pages();

respond([
    'user' => $user,
    'allowed_pages' => $allowedPages, // null = كل الصفحات مسموحة (مدير)
]);
