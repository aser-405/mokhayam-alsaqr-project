<?php
/**
 * نقطة عامة (بدون تسجيل دخول) يتحقق منها أي شخص إذا عائلته مسجّلة بالنظام أم لا،
 * عن طريق رقم الهوية فقط. الرد مقصود يكون بأقل معلومات ممكنة (خصوصية) — بس
 * تأكيد التسجيل من عدمه + رقم البطاقة إذا موجود.
 */

require_once __DIR__ . '/../includes/response.php';
require_once __DIR__ . '/../config/db.php';

$idNumber = trim($_GET['id_number'] ?? '');

if ($idNumber === '') {
    respond_error('رقم الهوية مطلوب', 422);
}

// 1) هل رقم الهوية هو رب أسرة مسجّل فعليًا؟
$stmt = $pdo->prepare('SELECT card_number, head_name FROM families WHERE head_id_number = ? LIMIT 1');
$stmt->execute([$idNumber]);
$family = $stmt->fetch();

if ($family) {
    respond([
        'status' => 'مسجّل',
        'role' => 'رب الأسرة',
        'card_number' => $family['card_number'],
    ]);
}

// 2) هل هو فرد ضمن عائلة (مو رب الأسرة)؟
$stmt = $pdo->prepare(
    'SELECT f.card_number, i.relation
     FROM individuals i JOIN families f ON f.id = i.family_id
     WHERE i.id_number = ? LIMIT 1'
);
$stmt->execute([$idNumber]);
$individual = $stmt->fetch();

if ($individual) {
    respond([
        'status' => 'مسجّل',
        'role' => $individual['relation'],
        'card_number' => $individual['card_number'],
    ]);
}

// 3) هل قدّم طلب انضمام (لسا ما انقبل/ولا انرفض)، أو انرفض سابقًا؟
$stmt = $pdo->prepare(
    'SELECT request_code, status FROM join_requests WHERE head_id_number = ? ORDER BY created_at DESC LIMIT 1'
);
$stmt->execute([$idNumber]);
$request = $stmt->fetch();

if ($request) {
    respond([
        'status' => $request['status'] === 'قيد المراجعة' ? 'قيد المراجعة' : 'مرفوض',
        'request_code' => $request['request_code'],
    ]);
}

// 4) ما في أي أثر لرقم الهوية هاد بالنظام
respond(['status' => 'غير مسجل']);
