<?php
require_once __DIR__ . '/../includes/response.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_page_access('zones');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query(
        'SELECT z.id, z.name, z.color, COUNT(f.id) AS families_count
         FROM zones z
         LEFT JOIN families f ON f.zone_id = z.id
         GROUP BY z.id, z.name, z.color
         ORDER BY z.created_at ASC'
    );
    respond(['zones' => $stmt->fetchAll()]);
}

if ($method === 'POST') {
    $input = json_input();
    $name  = trim($input['name'] ?? '');
    $color = $input['color'] ?? 'gold';

    if ($name === '') {
        respond_error('اسم المربع/المنطقة مطلوب', 422);
    }

    $dup = $pdo->prepare('SELECT id FROM zones WHERE name = ?');
    $dup->execute([$name]);
    if ($dup->fetch()) {
        respond_error('هذا المربع موجود مسبقًا', 409);
    }

    $stmt = $pdo->prepare('INSERT INTO zones (name, color) VALUES (?, ?)');
    $stmt->execute([$name, $color]);

    respond(['success' => true, 'id' => (int) $pdo->lastInsertId()], 201);
}

if ($method === 'DELETE') {
    require_admin();

    $id = (int) ($_GET['id'] ?? 0);
    if (!$id) {
        respond_error('المعرّف مطلوب', 422);
    }
    $pdo->prepare('DELETE FROM zones WHERE id = ?')->execute([$id]);
    respond(['success' => true]);
}

respond_error('طريقة غير مسموحة', 405);
