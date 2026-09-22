<?php
require_once __DIR__ . '/../includes/response.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_page_access('scan-distribution');

$cardNumber = trim($_GET['card_number'] ?? '');

if ($cardNumber === '') {
    respond_error('رقم البطاقة مطلوب', 422);
}

// لو المستخدم كتب رقم بس (مثال: "1" أو "14")، حوّله لصيغة البطاقة الكاملة FAM-00001
// تلقائيًا، بدل ما يضطر يكتب "FAM-" ويحسب الأصفار يدويًا.
if (ctype_digit($cardNumber)) {
    $cardNumber = 'FAM-' . str_pad($cardNumber, 5, '0', STR_PAD_LEFT);
} elseif (preg_match('/^fam-?(\d+)$/i', $cardNumber, $m)) {
    // يقبل كمان صيغ متل "fam1" أو "FAM1" أو "fam-1" بدون أصفار كاملة
    $cardNumber = 'FAM-' . str_pad($m[1], 5, '0', STR_PAD_LEFT);
}

$stmt = $pdo->prepare('SELECT * FROM families WHERE card_number = ? LIMIT 1');
$stmt->execute([$cardNumber]);
$family = $stmt->fetch();

if (!$family) {
    respond_error('لا توجد عائلة بهذا الرقم', 404);
}

$last = $pdo->prepare(
    'SELECT d.distributed_at, t.name AS aid_type_name
     FROM distributions d
     JOIN aid_types t ON t.id = d.aid_type_id
     WHERE d.family_id = ?
     ORDER BY d.distributed_at DESC, d.id DESC
     LIMIT 1'
);
$last->execute([$family['id']]);
$lastAid = $last->fetch();

respond([
    'family' => $family,
    'last_distribution' => $lastAid ?: null,
]);
