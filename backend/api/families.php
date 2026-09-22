<?php
require_once __DIR__ . '/../includes/response.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_page_access('families');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $q = trim($_GET['q'] ?? '');
    $base = 'SELECT f.*, z.name AS zone_name FROM families f LEFT JOIN zones z ON z.id = f.zone_id';

    if ($q !== '') {
        $stmt = $pdo->prepare(
            $base . ' WHERE f.head_name LIKE ? OR f.head_id_number LIKE ? OR f.card_number LIKE ?
             ORDER BY f.created_at DESC LIMIT 300'
        );
        $like = "%{$q}%";
        $stmt->execute([$like, $like, $like]);
    } else {
        $stmt = $pdo->query($base . ' ORDER BY f.created_at DESC LIMIT 300');
    }

    respond(['families' => $stmt->fetchAll()]);
}

if ($method === 'POST') {
    $input = json_input();
    $editId = (int) ($input['id'] ?? 0);

    $headName      = trim($input['head_name'] ?? '');
    $headId        = trim($input['head_id_number'] ?? '');
    $headGender    = $input['head_gender'] ?? null;
    $headBirth     = trim($input['head_birthdate'] ?? '') ?: null; // اختياري
    $phone         = trim($input['phone'] ?? '') ?: null;
    $maritalStatus = $input['marital_status'] ?? 'متزوج';
    $spouseName    = trim($input['spouse_name'] ?? '') ?: null;
    $spouseId      = trim($input['spouse_id_number'] ?? '') ?: null;
    $spouseBirth   = $input['spouse_birthdate'] ?? null;
    $memberCount   = (int) ($input['member_count'] ?? 1);
    $zoneId        = !empty($input['zone_id']) ? (int) $input['zone_id'] : null;

    if (!in_array($headGender, ['ذكر', 'أنثى'], true)) {
        $headGender = null;
    }

    if ($headName === '' || $headId === '') {
        respond_error('اسم رب الأسرة ورقم الهوية مطلوبين', 422);
    }

    // ---- تحديث عائلة موجودة ----
    if ($editId) {
        $check = $pdo->prepare('SELECT id FROM families WHERE id = ?');
        $check->execute([$editId]);
        if (!$check->fetch()) {
            respond_error('العائلة غير موجودة', 404);
        }

        $dup = $pdo->prepare('SELECT id FROM families WHERE head_id_number = ? AND id != ?');
        $dup->execute([$headId, $editId]);
        if ($dup->fetch()) {
            respond_error('رقم هوية رب الأسرة مسجّل مسبقًا لعائلة تانية', 409);
        }

        $stmt = $pdo->prepare(
            'UPDATE families SET head_name=?, head_id_number=?, head_gender=?, head_birthdate=?, phone=?, zone_id=?, marital_status=?,
             spouse_name=?, spouse_id_number=?, spouse_birthdate=?, member_count=? WHERE id=?'
        );
        $stmt->execute([
            $headName, $headId, $headGender, $headBirth, $phone, $zoneId, $maritalStatus,
            $spouseName, $spouseId, $spouseBirth, max(1, $memberCount), $editId,
        ]);

        respond(['success' => true, 'id' => $editId, 'updated' => true]);
    }

    // ---- إضافة عائلة جديدة ----
    $dup = $pdo->prepare('SELECT id FROM families WHERE head_id_number = ?');
    $dup->execute([$headId]);
    if ($dup->fetch()) {
        respond_error('رقم هوية رب الأسرة مسجّل مسبقًا', 409);
    }

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            'INSERT INTO families
             (card_number, head_name, head_id_number, head_gender, head_birthdate, phone, zone_id, marital_status,
              spouse_name, spouse_id_number, spouse_birthdate, member_count)
             VALUES ("", ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $headName, $headId, $headGender, $headBirth, $phone, $zoneId, $maritalStatus,
            $spouseName, $spouseId, $spouseBirth, max(1, $memberCount),
        ]);

        $newId = (int) $pdo->lastInsertId();
        // رقم البطاقة يُبنى من الـ id التلقائي نفسه، فما في احتمال تكرار حتى لو أكتر من موظف بيضيف بنفس اللحظة.
        $cardNumber = 'FAM-' . str_pad((string) $newId, 5, '0', STR_PAD_LEFT);

        $update = $pdo->prepare('UPDATE families SET card_number = ? WHERE id = ?');
        $update->execute([$cardNumber, $newId]);

        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        respond_error('تعذّر حفظ العائلة', 500);
    }

    respond(['success' => true, 'id' => $newId, 'card_number' => $cardNumber], 201);
}

if ($method === 'DELETE') {
    require_admin();

    $all = $_GET['all'] ?? '';
    $id  = (int) ($_GET['id'] ?? 0);

    if ($all === '1') {
        $pdo->exec('DELETE FROM families');
        respond(['success' => true, 'deleted' => 'all']);
    }

    if (!$id) {
        respond_error('المعرّف مطلوب', 422);
    }
    $pdo->prepare('DELETE FROM families WHERE id = ?')->execute([$id]);
    respond(['success' => true]);
}

respond_error('طريقة غير مسموحة', 405);
