<?php
require_once __DIR__ . '/../includes/response.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_page_access('categories');

// كل الفئات (حتى المُضافة حديثًا وبدون أي فرد فيها بعد)، مع عدد الأفراد الفعلي لكل وحدة.
$stmt = $pdo->query(
    'SELECT c.id, c.name, c.color, COUNT(i.id) AS total
     FROM special_categories c
     LEFT JOIN individuals i ON i.special_category_id = c.id
     GROUP BY c.id, c.name, c.color
     ORDER BY c.created_at ASC'
);

respond(['categories' => $stmt->fetchAll()]);
