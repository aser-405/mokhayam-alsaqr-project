<?php
require_once __DIR__ . '/../includes/response.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_admin();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at ASC');
    respond(['users' => $stmt->fetchAll()]);
}

if ($method === 'POST') {
    $input = json_input();

    $name     = trim($input['name'] ?? '');
    $email    = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';
    $role     = $input['role'] ?? 'مدخل بيانات';

    if ($name === '' || $email === '' || $password === '') {
        respond_error('الاسم، البريد الإلكتروني، وكلمة المرور مطلوبين', 422);
    }
    if (!in_array($role, ['مدير', 'مدخل بيانات'], true)) {
        respond_error('صلاحية غير صالحة', 422);
    }

    $dup = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $dup->execute([$email]);
    if ($dup->fetch()) {
        respond_error('هذا البريد الإلكتروني مسجّل مسبقًا', 409);
    }

    // ⚠️ وضع تطوير فقط: الباسورد بينحفظ نص عادي بدون تشفير — راجع ملاحظة الأمان بـ README.md
    $stmt = $pdo->prepare('INSERT INTO users (name, email, password_plain, role) VALUES (?, ?, ?, ?)');
    $stmt->execute([$name, $email, $password, $role]);

    respond(['success' => true, 'id' => (int) $pdo->lastInsertId()], 201);
}

if ($method === 'DELETE') {
    $id = (int) ($_GET['id'] ?? 0);
    if (!$id) {
        respond_error('المعرّف مطلوب', 422);
    }
    if ($id === current_user_id()) {
        respond_error('ما بتقدر تحذف حسابك الخاص وأنت مسجّل دخول فيه', 422);
    }
    $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
    respond(['success' => true]);
}

respond_error('طريقة غير مسموحة', 405);
