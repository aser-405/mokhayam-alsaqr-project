<?php
/**
 * استيراد جماعي للعائلات من ملف إكسل.
 * الفرونت بيقرأ ملف الإكسل بالمتصفح (مكتبة SheetJS) ويحوّله لمصفوفة JSON،
 * وهاد الملف بياخد المصفوفة الجاهزة ويدخلها لقاعدة البيانات صف صف.
 *
 * الأعمدة متساهل فيها (بيقبل أكتر من اسم شائع لنفس الحقل)، ماعدا الاسم
 * ورقم الهوية يلي لازم يكونوا موجودين. تاريخ الميلاد اختياري تمامًا (كثير
 * من كشوفات الإسكان ما فيها تاريخ ميلاد).
 */

require_once __DIR__ . '/../includes/response.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_admin(); // الاستيراد الجماعي عملية حساسة، مقصورة على المدير فقط

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond_error('طريقة غير مسموحة', 405);
}

$input = json_input();
$rows = is_array($input['rows'] ?? null) ? $input['rows'] : [];

if (empty($rows)) {
    respond_error('ما في صفوف لاستيرادها', 422);
}

/** يشيل علامات اتجاه النص الخفية (RTL/LTR marks) يلي بتنسخ أحيانًا من إكسل، ومسافات زيادة. */
function clean_text(string $v): string {
    $v = preg_replace('/[\x{200E}\x{200F}\x{202A}-\x{202E}]/u', '', $v);
    $v = preg_replace('/\s+/u', ' ', $v);
    return trim($v);
}

/** يجرّب أكتر من اسم عمود محتمل لنفس الحقل (بمقارنة متساهلة مع المسافات)، ويرجع أول قيمة يلاقيها. */
function pick_field(array $row, array $possibleKeys) {
    // فهرس بأسماء أعمدة الصف بعد التنظيف، لمقارنة أدق من مجرد isset المباشر
    static $cleanRowCache = null;
    $cleanRow = [];
    foreach ($row as $k => $v) {
        $cleanRow[clean_text((string) $k)] = $v;
    }
    foreach ($possibleKeys as $key) {
        $cleanKey = clean_text($key);
        if (isset($cleanRow[$cleanKey]) && clean_text((string) $cleanRow[$cleanKey]) !== '') {
            return $cleanRow[$cleanKey];
        }
    }
    return null;
}

/** يحوّل رقم هوية/جوال جاي من إكسل (ممكن يوصل كرقم عشري متل 401236633.0) لنص صحيح نضيف. */
function normalize_id_like($value): ?string {
    if ($value === null) return null;
    if (is_numeric($value)) {
        return sprintf('%.0f', (float) $value);
    }
    $v = clean_text((string) $value);
    return $v !== '' ? $v : null;
}

/** يحوّل رقم تسلسلي تاريخ إكسل (مثال: 31129) لتاريخ ميلادي حقيقي. */
function excel_serial_to_date(float $serial): string {
    // إكسل بيعتبر 1900-01-01 هو اليوم رقم 1 (مع خطأ تاريخي شهير بحساب سنة 1900 كبيسة)
    $unixTimestamp = ($serial - 25569) * 86400;
    return gmdate('Y-m-d', (int) $unixTimestamp);
}

/**
 * يحوّل قيمة تاريخ لصيغة YYYY-MM-DD قابلة للتخزين، أو null لو مش قادر يفهمها.
 * بيتعامل مع: صيغة جاهزة YYYY-MM-DD، رقم تسلسلي من إكسل، وصيغة يوم/شهر/سنة
 * (الشائعة بمنطقتنا) بشكل صريح لتفادي لخبطة strtotime بين DD/MM وMM/DD.
 */
function normalize_date_like($value): ?string {
    if ($value === null) return null;

    // لو وصل كرقم (تاريخ إكسل خام لسا ما انحول بالفرونت)
    if (is_numeric($value) && (float) $value > 1000) {
        return excel_serial_to_date((float) $value);
    }

    $v = clean_text((string) $value);
    if ($v === '') return null;

    // صيغة جاهزة YYYY-MM-DD (هيك بتوصل عادة بعد تحويل الفرونت للتواريخ الحقيقية)
    if (preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})$/', $v, $m)) {
        return sprintf('%04d-%02d-%02d', $m[1], $m[2], $m[3]);
    }

    // صيغة يوم/شهر/سنة أو يوم-شهر-سنة (الشائعة عندنا: DD/MM/YYYY)
    if (preg_match('#^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$#', $v, $m)) {
        $day = (int) $m[1];
        $month = (int) $m[2];
        $year = (int) $m[3];
        if ($month > 12 && $day <= 12) { // احتياط لو الصيغة كانت MM/DD/YYYY فعليًا
            [$day, $month] = [$month, $day];
        }
        if (checkdate($month, $day, $year)) {
            return sprintf('%04d-%02d-%02d', $year, $month, $day);
        }
        return null;
    }

    // آخر محاولة: نخلي PHP يحاول يفهمها
    $ts = strtotime($v);
    return $ts ? date('Y-m-d', $ts) : null;
}

/** يطبّع الحالة الاجتماعية من صيغ شائعة بكشوفات الإسكان (مثل "متزوج / متزوجة") لقيمة من قيمنا الثابتة. */
function normalize_marital_status($value): string {
    if ($value === null) return 'متزوج';
    $v = clean_text((string) $value);
    if ($v === '') return 'متزوج';

    $map = [
        'أعزب' => 'أعزب', 'عزباء' => 'أعزب', 'اعزب' => 'أعزب',
        'متزوج' => 'متزوج', 'متزوجة' => 'متزوج',
        'مطلق' => 'مطلق', 'مطلقة' => 'مطلق',
        'أرمل' => 'أرمل', 'ارمل' => 'أرمل', 'أرملة' => 'أرمل', 'ارملة' => 'أرمل',
    ];
    foreach ($map as $needle => $result) {
        if (mb_strpos($v, $needle) !== false) return $result;
    }
    return 'متزوج';
}

$headNameKeys    = ['اسم رب الأسرة', 'الاسم رباعي', 'الاسم الرباعي', 'الاسم', 'اسم رب الاسرة'];
$headIdKeys      = ['رقم هوية رب الأسرة', 'رقم الهوية', 'رقم هوية رب الاسرة'];
$headBirthKeys   = [
    'تاريخ ميلاد رب الأسرة', 'تاريخ ميلاد رب الاسرة', 'تاريخ الميلاد',
    'تاريخ ميلاد', 'الميلاد', 'تاريخ الولادة', 'ت. الميلاد',
];
$headGenderKeys  = ['الجنس', 'جنس رب الأسرة'];
$phoneKeys       = ['رقم الجوال', 'رقم الهاتف', 'رقم التواصل', 'رقم التواصل الأول', 'رقم التواصل 1'];
$maritalKeys     = ['الحالة الاجتماعية', 'الحالة الإجتماعية', 'الحاله الاجتماعية'];
$spouseNameKeys  = ['اسم الزوجة', 'اسم الزوجة رباعي', 'اسم الزوجة الرباعي'];
$spouseIdKeys    = ['رقم هوية الزوجة'];
$spouseBirthKeys = ['تاريخ ميلاد الزوجة', 'تاريخ ميلاد الزوجه'];
$memberCountKeys = ['عدد أفراد الأسرة', 'عدد أفراد الاسرة', 'عدد الأفراد', 'عدد افراد الاسرة'];

/** يطبّع قيمة الجنس لواحدة من قيمتينا الثابتتين، أو null لو مش واضحة. */
function normalize_gender($value): ?string {
    if ($value === null) return null;
    $v = clean_text((string) $value);
    if (mb_strpos($v, 'ذكر') !== false) return 'ذكر';
    if (mb_strpos($v, 'أنث') !== false || mb_strpos($v, 'انث') !== false) return 'أنثى';
    return null;
}

$inserted = 0;
$skipped = [];

$findStmt = $pdo->prepare('SELECT id FROM families WHERE head_id_number = ?');
$insertStmt = $pdo->prepare(
    'INSERT INTO families
     (card_number, head_name, head_id_number, head_gender, head_birthdate, phone, marital_status,
      spouse_name, spouse_id_number, spouse_birthdate, member_count)
     VALUES ("", ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
$updateCardStmt = $pdo->prepare('UPDATE families SET card_number = ? WHERE id = ?');

foreach ($rows as $i => $row) {
    $rowNum = $i + 2; // +2 لأنه الصف الأول بالإكسل هو رؤوس الأعمدة، والصفوف تبلش من 1

    $headName  = clean_text((string) (pick_field($row, $headNameKeys) ?? ''));
    $headId    = normalize_id_like(pick_field($row, $headIdKeys));
    $headGender = normalize_gender(pick_field($row, $headGenderKeys));
    $headBirth = normalize_date_like(pick_field($row, $headBirthKeys)); // اختياري تمامًا
    $phone     = normalize_id_like(pick_field($row, $phoneKeys));
    $marital   = normalize_marital_status(pick_field($row, $maritalKeys));
    $spouseName  = pick_field($row, $spouseNameKeys);
    $spouseName  = $spouseName !== null ? clean_text((string) $spouseName) : null;
    $spouseId    = normalize_id_like(pick_field($row, $spouseIdKeys));
    $spouseBirth = normalize_date_like(pick_field($row, $spouseBirthKeys));
    $memberCount = (int) (pick_field($row, $memberCountKeys) ?? 1);

    if ($headName === '' || $headId === null) {
        $skipped[] = "صف {$rowNum}: بيانات ناقصة (الاسم أو رقم الهوية)";
        continue;
    }

    $findStmt->execute([$headId]);
    if ($findStmt->fetch()) {
        $skipped[] = "صف {$rowNum}: رقم الهوية {$headId} مسجّل مسبقًا";
        continue;
    }

    try {
        $insertStmt->execute([
            $headName, $headId, $headGender, $headBirth, $phone, $marital,
            $spouseName, $spouseId, $spouseBirth, max(1, $memberCount),
        ]);
        $newId = (int) $pdo->lastInsertId();
        $cardNumber = 'FAM-' . str_pad((string) $newId, 5, '0', STR_PAD_LEFT);
        $updateCardStmt->execute([$cardNumber, $newId]);
        $inserted++;
    } catch (Exception $e) {
        $skipped[] = "صف {$rowNum}: تعذّر الحفظ ({$e->getMessage()})";
    }
}

respond([
    'success' => true,
    'inserted' => $inserted,
    'skipped_count' => count($skipped),
    'skipped_details' => $skipped,
]);
