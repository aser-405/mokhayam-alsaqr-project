<?php
/**
 * التحقق من تسجيل الدخول عبر الجلسة (Session) + التحقق من الصلاحيات (الأدوار).
 * ضيف require_once هالملف بأول أي ملف API لازم يكون محمي.
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

function require_login(): void {
    if (empty($_SESSION['user_id'])) {
        respond_error('يجب تسجيل الدخول أولاً', 401);
    }
}

function current_user_id(): ?int {
    return $_SESSION['user_id'] ?? null;
}

function current_role(): ?string {
    return $_SESSION['role'] ?? null;
}

/** يسمح فقط لدور "مدير" — يُستخدم لإدارة المستخدمين، الإعدادات، وكل عمليات الحذف. */
function require_admin(): void {
    require_login();
    if (current_role() !== 'مدير') {
        respond_error('هذا الإجراء يتطلب صلاحية مدير النظام', 403);
    }
}

/** يرجع قائمة الصفحات المسموحة لدور "مدخل بيانات" من جدول settings. */
function get_data_entry_allowed_pages(): array {
    global $pdo;
    $stmt = $pdo->prepare("SELECT setting_value FROM settings WHERE setting_key = 'data_entry_allowed_pages'");
    $stmt->execute();
    $value = $stmt->fetchColumn();
    $decoded = $value ? json_decode($value, true) : [];
    return is_array($decoded) ? $decoded : [];
}

/**
 * يتحقق من الدخول + إذا الدور "مدخل بيانات"، يتحقق إنه هالصفحة مسموحة إله من الإعدادات.
 * دور "مدير" يعدي دايمًا بدون قيود.
 */
function require_page_access(string $pageKey): void {
    require_login();
    if (current_role() === 'مدير') return;

    $allowed = get_data_entry_allowed_pages();
    if (!in_array($pageKey, $allowed, true)) {
        respond_error('غير مصرح لك بالوصول لهذا القسم', 403);
    }
}

/** نفس الفكرة، بس تسمح إذا أي صفحة من عدة صفحات محتملة مسموحة (مفيد لـ endpoint مشترك بين صفحتين). */
function require_any_page_access(array $pageKeys): void {
    require_login();
    if (current_role() === 'مدير') return;

    $allowed = get_data_entry_allowed_pages();
    foreach ($pageKeys as $key) {
        if (in_array($key, $allowed, true)) return;
    }
    respond_error('غير مصرح لك بالوصول لهذا القسم', 403);
}
