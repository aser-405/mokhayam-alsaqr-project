<?php
require_once __DIR__ . '/../includes/response.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_page_access('join-requests');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query(
        "SELECT r.*, z.name AS zone_name FROM join_requests r
         LEFT JOIN zones z ON z.id = r.zone_id
         WHERE r.status = 'قيد المراجعة' ORDER BY r.created_at ASC"
    );
    $requests = $stmt->fetchAll();

    if ($requests) {
        $ids = array_column($requests, 'id');
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $memberStmt = $pdo->prepare(
            "SELECT * FROM join_request_members WHERE join_request_id IN ($placeholders) ORDER BY id"
        );
        $memberStmt->execute($ids);
        $membersByRequest = [];
        foreach ($memberStmt->fetchAll() as $m) {
            $membersByRequest[$m['join_request_id']][] = $m;
        }
        foreach ($requests as &$r) {
            $r['members'] = $membersByRequest[$r['id']] ?? [];
        }
        unset($r);
    }

    respond(['requests' => $requests]);
}

if ($method === 'POST') {
    $input = json_input();
    $id     = (int) ($input['id'] ?? 0);
    $action = $input['action'] ?? '';

    if (!$id || !in_array($action, ['accept', 'reject'], true)) {
        respond_error('بيانات غير صالحة', 422);
    }

    $stmt = $pdo->prepare('SELECT * FROM join_requests WHERE id = ?');
    $stmt->execute([$id]);
    $req = $stmt->fetch();

    if (!$req) {
        respond_error('الطلب غير موجود', 404);
    }

    if ($action === 'reject') {
        $pdo->prepare("UPDATE join_requests SET status = 'مرفوض' WHERE id = ?")->execute([$id]);
        respond(['success' => true, 'status' => 'مرفوض']);
    }

    // accept -> ينشئ عائلة جديدة + أفراد الأسرة من بيانات الطلب
    $pdo->beginTransaction();
    try {
        $insert = $pdo->prepare(
            'INSERT INTO families
             (card_number, head_name, head_id_number, head_birthdate, phone, zone_id, marital_status,
              spouse_name, spouse_id_number, spouse_birthdate, member_count)
             VALUES ("", ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $insert->execute([
            $req['head_name'], $req['head_id_number'], $req['head_birthdate'], $req['phone1'], $req['zone_id'],
            $req['marital_status'], $req['spouse_name'], $req['spouse_id_number'], $req['spouse_birthdate'],
            max(1, (int) $req['member_count']),
        ]);

        $newFamilyId = (int) $pdo->lastInsertId();
        $cardNumber = 'FAM-' . str_pad((string) $newFamilyId, 5, '0', STR_PAD_LEFT);
        $pdo->prepare('UPDATE families SET card_number = ? WHERE id = ?')->execute([$cardNumber, $newFamilyId]);

        // -- إنشاء سجلات الأفراد تلقائيًا --
        // ملاحظة: نموذج طلب الانضمام ما بياخد جنس رب الأسرة ولا كل فرد بالاسم صراحة،
        // فبنعتمد افتراضات معقولة هون (رب الأسرة = ذكر، الزوجة = أنثى، وتوزيع بقية
        // الأفراد حسب عدد الذكور/الإناث المُدخل). راجع/صحّح الجنس يدويًا من صفحة
        // "الأفراد" إذا لزم الأمر.
        $indStmt = $pdo->prepare(
            'INSERT INTO individuals (family_id, full_name, id_number, birthdate, gender, relation, special_category_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );

        // الفئات الخاصة صارت جدول قابل للتعديل من الإدارة (صفحة "الفئات الخاصة")،
        // فبنحاول نلاقي فئة موجودة بنفس الاسم بدل ما نفترض قيم ثابتة. إذا الفئة
        // مش موجودة أصلاً، منترك الفرد بدون فئة (NULL) والإدارة تقدر تحددها يدويًا.
        $findCategoryId = function (string $name) use ($pdo): ?int {
            $stmt = $pdo->prepare('SELECT id FROM special_categories WHERE name = ? LIMIT 1');
            $stmt->execute([$name]);
            $row = $stmt->fetch();
            return $row ? (int) $row['id'] : null;
        };

        $indStmt->execute([
            $newFamilyId, $req['head_name'], $req['head_id_number'], $req['head_birthdate'],
            'ذكر', 'رب الأسرة', null,
        ]);

        if (!empty($req['spouse_name']) && !empty($req['spouse_id_number'])) {
            $indStmt->execute([
                $newFamilyId, $req['spouse_name'], $req['spouse_id_number'],
                $req['spouse_birthdate'] ?: $req['head_birthdate'], 'أنثى', 'الزوجة', null,
            ]);
        }

        $memberStmt = $pdo->prepare(
            'SELECT * FROM join_request_members WHERE join_request_id = ? ORDER BY id'
        );
        $memberStmt->execute([$id]);
        $members = $memberStmt->fetchAll();

        $maleLeft = (int) $req['male_count'];
        foreach ($members as $i => $m) {
            $gender = $maleLeft > 0 ? 'ذكر' : 'أنثى';
            $maleLeft--;

            $age = (int) $m['age'];
            $approxBirthYear = (int) date('Y') - $age;
            $approxBirthdate = "{$approxBirthYear}-01-01"; // تاريخ تقريبي مبني على العمر فقط

            $categoryId = null;
            if ($age < 18) $categoryId = $findCategoryId('طفل');
            elseif ($age >= 60) $categoryId = $findCategoryId('كبير سن');

            // رقم هوية مؤقت فريد (الفرد ما عندو رقم هوية حقيقي بنموذج الطلب) — لازم يُستبدل يدويًا لاحقًا
            $tempId = 'TMP-' . $newFamilyId . '-' . ($i + 1);

            $relation = $gender === 'ذكر' ? 'ابن' : 'ابنة';

            $indStmt->execute([
                $newFamilyId, $m['full_name'], $tempId, $approxBirthdate, $gender, $relation, $categoryId,
            ]);
        }

        $pdo->prepare("UPDATE join_requests SET status = 'مقبول' WHERE id = ?")->execute([$id]);

        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        respond_error('تعذّر قبول الطلب', 500);
    }

    respond(['success' => true, 'status' => 'مقبول', 'family_id' => $newFamilyId, 'card_number' => $cardNumber]);
}

respond_error('طريقة غير مسموحة', 405);
