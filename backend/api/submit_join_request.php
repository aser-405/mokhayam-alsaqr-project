<?php
/**
 * نقطة عامة (بدون تسجيل دخول) يستخدمها الأهالي أنفسهم لتعبئة طلب انضمام.
 * الإدارة بعدين بتراجع الطلب من صفحة "طلبات الانضمام" وتقبل أو ترفض.
 */

require_once __DIR__ . '/../includes/response.php';
require_once __DIR__ . '/../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond_error('طريقة غير مسموحة', 405);
}

$input = json_input();

$headName      = trim($input['head_name'] ?? '');
$headId        = trim($input['head_id_number'] ?? '');
$headBirth     = $input['head_birthdate'] ?? '';
$phone1        = trim($input['phone1'] ?? '');
$phone2        = trim($input['phone2'] ?? '') ?: null;
$maritalStatus = $input['marital_status'] ?? 'متزوج';
$healthStatus  = trim($input['health_status'] ?? '') ?: null;
$spouseName    = trim($input['spouse_name'] ?? '') ?: null;
$spouseId      = trim($input['spouse_id_number'] ?? '') ?: null;
$spouseBirth   = $input['spouse_birthdate'] ?? null;
$maleCount     = (int) ($input['male_count'] ?? 0);
$femaleCount   = (int) ($input['female_count'] ?? 0);
$zoneId        = !empty($input['zone_id']) ? (int) $input['zone_id'] : null;
$members       = is_array($input['members'] ?? null) ? $input['members'] : [];

if ($headName === '' || $headId === '' || $headBirth === '' || $phone1 === '') {
    respond_error('الاسم، رقم الهوية، تاريخ الميلاد، ورقم التواصل الأول مطلوبين', 422);
}

$memberCount = count($members) > 0 ? count($members) : max(1, $maleCount + $femaleCount);

// رقم الطلب المرجعي: حرف A + 6 أرقام عشوائية (يكفي لتمييز الطلبات، ومو مفتاح أساسي حساس)
$requestCode = 'A-' . random_int(100000, 999999);

$pdo->beginTransaction();
try {
    $stmt = $pdo->prepare(
        'INSERT INTO join_requests
         (request_code, head_name, head_id_number, head_birthdate, phone1, phone2,
          marital_status, health_status, spouse_name, spouse_id_number, spouse_birthdate,
          member_count, male_count, female_count, zone_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $requestCode, $headName, $headId, $headBirth, $phone1, $phone2,
        $maritalStatus, $healthStatus, $spouseName, $spouseId, $spouseBirth,
        $memberCount, $maleCount, $femaleCount, $zoneId,
    ]);

    $requestId = (int) $pdo->lastInsertId();

    if (!empty($members)) {
        $memberStmt = $pdo->prepare(
            'INSERT INTO join_request_members (join_request_id, full_name, age) VALUES (?, ?, ?)'
        );
        foreach ($members as $m) {
            $name = trim($m['full_name'] ?? '');
            $age  = (int) ($m['age'] ?? 0);
            if ($name === '') continue;
            $memberStmt->execute([$requestId, $name, $age]);
        }
    }

    $pdo->commit();
} catch (Exception $e) {
    $pdo->rollBack();
    respond_error('تعذّر إرسال الطلب، حاول مرة ثانية', 500);
}

respond(['success' => true, 'request_code' => $requestCode], 201);
