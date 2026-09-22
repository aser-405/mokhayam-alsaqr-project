<?php
require_once __DIR__ . '/../includes/response.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_page_access('individuals');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $q = trim($_GET['q'] ?? '');

    $base = 'SELECT i.*, f.head_name AS family_name, c.name AS category_name
              FROM individuals i
              JOIN families f ON f.id = i.family_id
              LEFT JOIN special_categories c ON c.id = i.special_category_id';

    if ($q !== '') {
        $stmt = $pdo->prepare($base . ' WHERE i.full_name LIKE ? OR i.id_number LIKE ? OR f.head_name LIKE ?
                                ORDER BY i.created_at DESC LIMIT 500');
        $like = "%{$q}%";
        $stmt->execute([$like, $like, $like]);
    } else {
        $stmt = $pdo->query($base . ' ORDER BY i.created_at DESC LIMIT 500');
    }

    respond(['individuals' => $stmt->fetchAll()]);
}

if ($method === 'POST') {
    $input = json_input();
    $editId = (int) ($input['id'] ?? 0);

    $fullName  = trim($input['full_name'] ?? '');
    $idNumber  = trim($input['id_number'] ?? '');
    $birthdate = $input['birthdate'] ?? '';
    $gender    = $input['gender'] ?? '';
    $relation  = $input['relation'] ?? '';
    $familyId  = (int) ($input['family_id'] ?? 0);
    $categoryId = !empty($input['special_category_id']) ? (int) $input['special_category_id'] : null;

    if ($fullName === '' || $idNumber === '' || $birthdate === '' || !$familyId) {
        respond_error('الاسم، رقم الهوية، تاريخ الميلاد، والعائلة مطلوبين', 422);
    }

    $famCheck = $pdo->prepare('SELECT id FROM families WHERE id = ?');
    $famCheck->execute([$familyId]);
    if (!$famCheck->fetch()) {
        respond_error('العائلة المحددة غير موجودة', 404);
    }

    // ---- تحديث فرد موجود ----
    if ($editId) {
        $check = $pdo->prepare('SELECT id FROM individuals WHERE id = ?');
        $check->execute([$editId]);
        if (!$check->fetch()) {
            respond_error('الفرد غير موجود', 404);
        }

        $dup = $pdo->prepare('SELECT id FROM individuals WHERE id_number = ? AND id != ?');
        $dup->execute([$idNumber, $editId]);
        if ($dup->fetch()) {
            respond_error('رقم الهوية مسجّل مسبقًا لفرد تاني', 409);
        }

        $stmt = $pdo->prepare(
            'UPDATE individuals SET full_name=?, id_number=?, birthdate=?, gender=?, relation=?, family_id=?, special_category_id=?
             WHERE id=?'
        );
        $stmt->execute([$fullName, $idNumber, $birthdate, $gender, $relation, $familyId, $categoryId, $editId]);

        respond(['success' => true, 'id' => $editId, 'updated' => true]);
    }

    // ---- إضافة فرد جديد ----
    $dup = $pdo->prepare('SELECT id FROM individuals WHERE id_number = ?');
    $dup->execute([$idNumber]);
    if ($dup->fetch()) {
        respond_error('رقم الهوية مسجّل مسبقًا', 409);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO individuals (family_id, full_name, id_number, birthdate, gender, relation, special_category_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([$familyId, $fullName, $idNumber, $birthdate, $gender, $relation, $categoryId]);

    respond(['success' => true, 'id' => (int) $pdo->lastInsertId()], 201);
}

if ($method === 'DELETE') {
    require_admin();

    $all = $_GET['all'] ?? '';
    $id  = (int) ($_GET['id'] ?? 0);

    if ($all === '1') {
        $pdo->exec('DELETE FROM individuals');
        respond(['success' => true, 'deleted' => 'all']);
    }

    if (!$id) {
        respond_error('المعرّف مطلوب', 422);
    }
    $pdo->prepare('DELETE FROM individuals WHERE id = ?')->execute([$id]);
    respond(['success' => true]);
}

respond_error('طريقة غير مسموحة', 405);
