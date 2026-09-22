<?php
require_once __DIR__ . '/../includes/response.php';
require_once __DIR__ . '/../config/db.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond_error('طريقة غير مسموحة', 405);
}

$input = json_input();
$email = trim($input['email'] ?? '');
$password = $input['password'] ?? '';

if ($email === '' || $password === '') {
    respond_error('البريد الإلكتروني وكلمة المرور مطلوبان', 422);
}

$stmt = $pdo->prepare('SELECT id, name, email, password_plain, role FROM users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$user = $stmt->fetch();

// ⚠️ وضع تطوير فقط: مقارنة نص عادي بدون تشفير — راجع ملاحظة الأمان بـ README.md
if (!$user || $password !== $user['password_plain']) {
    respond_error('البريد الإلكتروني أو كلمة المرور غير صحيحة', 401);
}

$_SESSION['user_id'] = $user['id'];
$_SESSION['role'] = $user['role'];

respond([
    'success' => true,
    'user' => [
        'id'    => $user['id'],
        'name'  => $user['name'],
        'email' => $user['email'],
        'role'  => $user['role'],
    ],
]);
