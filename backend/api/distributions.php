<?php
require_once __DIR__ . '/../includes/response.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_any_page_access(['aid-log', 'scan-distribution']);

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $q = trim($_GET['q'] ?? '');

    $base = 'SELECT d.id, d.quantity, d.distributed_at, f.head_name AS family_name, f.card_number,
                    t.name AS aid_type_name
             FROM distributions d
             JOIN families f ON f.id = d.family_id
             JOIN aid_types t ON t.id = d.aid_type_id';

    if ($q !== '') {
        $stmt = $pdo->prepare($base . ' WHERE f.head_name LIKE ? OR t.name LIKE ? OR f.card_number LIKE ?
                                ORDER BY d.distributed_at DESC, d.id DESC LIMIT 500');
        $like = "%{$q}%";
        $stmt->execute([$like, $like, $like]);
    } else {
        $stmt = $pdo->query($base . ' ORDER BY d.distributed_at DESC, d.id DESC LIMIT 500');
    }

    respond(['distributions' => $stmt->fetchAll()]);
}

if ($method === 'POST') {
    $input = json_input();

    $allFamilies = !empty($input['all_families']);
    $aidTypeId   = (int) ($input['aid_type_id'] ?? 0);
    $quantity    = max(1, (int) ($input['quantity'] ?? 1));
    $distributedAt = $input['distributed_at'] ?? date('Y-m-d');

    if (!$aidTypeId) {
        respond_error('نوع المساعدة مطلوب', 422);
    }

    // ---- توزيع دفعة وحدة على كل العائلات المسجّلة (يتجاهل التكرار بصمت) ----
    if ($allFamilies) {
        $familyIds = $pdo->query('SELECT id FROM families')->fetchAll(PDO::FETCH_COLUMN);

        if (empty($familyIds)) {
            respond_error('ما في عائلات مسجّلة حاليًا لتوزيع المساعدة عليها', 422);
        }

        $checkStmt = $pdo->prepare(
            'SELECT id FROM distributions WHERE family_id = ? AND aid_type_id = ? AND distributed_at = ?'
        );
        $insertStmt = $pdo->prepare(
            'INSERT INTO distributions (family_id, aid_type_id, quantity, distributed_at) VALUES (?, ?, ?, ?)'
        );

        $added = 0;
        $skipped = 0;

        $pdo->beginTransaction();
        try {
            foreach ($familyIds as $fid) {
                $checkStmt->execute([$fid, $aidTypeId, $distributedAt]);
                if ($checkStmt->fetch()) {
                    $skipped++;
                    continue;
                }
                $insertStmt->execute([$fid, $aidTypeId, $quantity, $distributedAt]);
                $added++;
            }
            $pdo->commit();
        } catch (Exception $e) {
            $pdo->rollBack();
            respond_error('تعذّر تسجيل التوزيع الجماعي', 500);
        }

        respond(['success' => true, 'added' => $added, 'skipped' => $skipped], 201);
    }

    // ---- توزيع لعائلة واحدة (السلوك الأصلي) — مع منع التكرار ----
    $familyId = (int) ($input['family_id'] ?? 0);
    if (!$familyId) {
        respond_error('العائلة ونوع المساعدة مطلوبين', 422);
    }

    $checkStmt = $pdo->prepare(
        'SELECT id FROM distributions WHERE family_id = ? AND aid_type_id = ? AND distributed_at = ?'
    );
    $checkStmt->execute([$familyId, $aidTypeId, $distributedAt]);
    if ($checkStmt->fetch()) {
        respond_error('هذه العائلة استلمت هذا النوع من المساعدة بنفس التاريخ مسبقًا', 409);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO distributions (family_id, aid_type_id, quantity, distributed_at) VALUES (?, ?, ?, ?)'
    );
    $stmt->execute([$familyId, $aidTypeId, $quantity, $distributedAt]);

    respond(['success' => true, 'id' => (int) $pdo->lastInsertId()], 201);
}

if ($method === 'DELETE') {
    require_admin();

    $all = $_GET['all'] ?? '';
    $id  = (int) ($_GET['id'] ?? 0);

    if ($all === '1') {
        $pdo->exec('DELETE FROM distributions');
        respond(['success' => true, 'deleted' => 'all']);
    }

    if (!$id) {
        respond_error('المعرّف مطلوب', 422);
    }
    $pdo->prepare('DELETE FROM distributions WHERE id = ?')->execute([$id]);
    respond(['success' => true]);
}

respond_error('طريقة غير مسموحة', 405);
