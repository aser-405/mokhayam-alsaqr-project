<?php
require_once __DIR__ . '/../includes/response.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_page_access('complaints');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query('SELECT * FROM complaints ORDER BY created_at DESC LIMIT 500');
    respond(['complaints' => $stmt->fetchAll()]);
}

if ($method === 'POST') {
    // تحديث حالة الشكوى (مراجعة)
    $input = json_input();
    $id = (int) ($input['id'] ?? 0);
    if (!$id) {
        respond_error('المعرّف مطلوب', 422);
    }
    $pdo->prepare("UPDATE complaints SET status = 'تمت المراجعة' WHERE id = ?")->execute([$id]);
    respond(['success' => true]);
}

if ($method === 'DELETE') {
    require_admin();

    $all = $_GET['all'] ?? '';
    $id  = (int) ($_GET['id'] ?? 0);

    if ($all === '1') {
        $pdo->exec('DELETE FROM complaints');
        respond(['success' => true, 'deleted' => 'all']);
    }
    if (!$id) {
        respond_error('المعرّف مطلوب', 422);
    }
    $pdo->prepare('DELETE FROM complaints WHERE id = ?')->execute([$id]);
    respond(['success' => true]);
}

respond_error('طريقة غير مسموحة', 405);
