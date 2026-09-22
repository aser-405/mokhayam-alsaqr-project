<?php
/**
 * دوال مساعدة مشتركة لكل ملفات الـ API.
 */

// امنع PHP من طباعة أي تحذير/خطأ داخل الرد نفسه (بيفسد الـ JSON) — سجّلها بدل ما تظهر.
// لو بدك تشوف الأخطاء وقت التطوير، دوّر على ملف error_log تبع Apache/PHP.
ini_set('display_errors', '0');
error_reporting(E_ALL);

// نبدأ تجميع أي خرج (output buffering) من هلق، عشان لو صار أي تحذير/ملاحظة PHP
// بالغلط (warning/notice) قبل الـ JSON، نقدر نلغيها ونضمن إنه الرد يوصل JSON نضيف
// دايمًا، مهما صار بالكود.
if (ob_get_level() === 0) {
    ob_start();
}

header('Content-Type: application/json; charset=utf-8');

// اسمح بطلبات من الواجهة الأمامية حتى لو اشتغلت من دومين/بورت مختلف أثناء التطوير.
// لو الفرونت والباك اند على نفس الدومين بالإنتاج، ممكن تشيل هالسطرين.
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function json_input(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function respond($data, int $status = 200): void {
    // نفضّي أي خرج غريب انطبع بالغلط قبل هيك (تحذيرات PHP وغيرها) قبل ما نرسل الـ JSON.
    if (ob_get_level() > 0) {
        ob_clean();
    }
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function respond_error(string $message, int $status = 400): void {
    respond(['error' => $message], $status);
}
