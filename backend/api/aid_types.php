<?php
require_once __DIR__ . '/../includes/response.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_page_access('aid-types');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query('SELECT * FROM aid_types ORDER BY created_at DESC');
    respond(['aid_types' => $stmt->fetchAll()]);
}

if ($method === 'POST') {
    $input = json_input();

    $name     = trim($input['name'] ?? '');
    $category = $input['category'] ?? '';
    $color    = $input['color'] ?? 'gold';
    $notes    = trim($input['notes'] ?? '') ?: null;

    if ($name === '' || $category === '') {
        respond_error('اسم النوع والتصنيف مطلوبين', 422);
    }

    $dup = $pdo->prepare('SELECT id FROM aid_types WHERE name = ?');
    $dup->execute([$name]);
    if ($dup->fetch()) {
        respond_error('هذا النوع موجود مسبقًا', 409);
    }

    $stmt = $pdo->prepare('INSERT INTO aid_types (name, category, color, notes) VALUES (?, ?, ?, ?)');
    $stmt->execute([$name, $category, $color, $notes]);

    respond(['success' => true, 'id' => (int) $pdo->lastInsertId()], 201);
}

if ($method === 'DELETE') {
    require_admin();

    $id = (int) ($_GET['id'] ?? 0);
    if (!$id) {
        respond_error('المعرّف مطلوب', 422);
    }

    $inUse = $pdo->prepare('SELECT COUNT(*) FROM distributions WHERE aid_type_id = ?');
    $inUse->execute([$id]);
    if ((int) $inUse->fetchColumn() > 0) {
        respond_error('ما بقدر أحذف هذا النوع لأنه مستخدم بسجل توزيع سابق', 409);
    }

    $pdo->prepare('DELETE FROM aid_types WHERE id = ?')->execute([$id]);
    respond(['success' => true]);
}

respond_error('طريقة غير مسموحة', 405);
