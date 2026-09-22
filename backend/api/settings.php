<?php
require_once __DIR__ . '/../includes/response.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_login(); // القراءة مسموحة لأي مستخدم مسجّل دخول (الفرونت بيحتاجها ليعرف شو يعرض)

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    respond(['allowed_pages' => get_data_entry_allowed_pages()]);
}

if ($method === 'POST') {
    require_admin(); // بس المدير يقدر يعدّل الصلاحيات

    $input = json_input();
    $pages = is_array($input['allowed_pages'] ?? null) ? $input['allowed_pages'] : [];

    $validPages = ['dashboard','families','join-requests','individuals','aid-types','aid-log','categories','scan-distribution','complaints','zones'];
    $pages = array_values(array_intersect($pages, $validPages));

    $stmt = $pdo->prepare(
        "INSERT INTO settings (setting_key, setting_value) VALUES ('data_entry_allowed_pages', ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)"
    );
    $stmt->execute([json_encode($pages, JSON_UNESCAPED_UNICODE)]);

    respond(['success' => true, 'allowed_pages' => $pages]);
}

respond_error('طريقة غير مسموحة', 405);
