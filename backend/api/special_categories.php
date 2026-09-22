<?php
require_once __DIR__ . '/../includes/response.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_page_access('categories');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query('SELECT * FROM special_categories ORDER BY created_at ASC');
    respond(['categories' => $stmt->fetchAll()]);
}

if ($method === 'POST') {
    $input = json_input();
    $name  = trim($input['name'] ?? '');
    $color = $input['color'] ?? 'gold';

    if ($name === '') {
        respond_error('اسم الفئة مطلوب', 422);
    }

    $dup = $pdo->prepare('SELECT id FROM special_categories WHERE name = ?');
    $dup->execute([$name]);
    if ($dup->fetch()) {
        respond_error('هذه الفئة موجودة مسبقًا', 409);
    }

    $stmt = $pdo->prepare('INSERT INTO special_categories (name, color) VALUES (?, ?)');
    $stmt->execute([$name, $color]);

    respond(['success' => true, 'id' => (int) $pdo->lastInsertId()], 201);
}

if ($method === 'DELETE') {
    require_admin();

    $id = (int) ($_GET['id'] ?? 0);
    if (!$id) {
        respond_error('المعرّف مطلوب', 422);
    }
    $pdo->prepare('DELETE FROM special_categories WHERE id = ?')->execute([$id]);
    respond(['success' => true]);
}

respond_error('طريقة غير مسموحة', 405);
