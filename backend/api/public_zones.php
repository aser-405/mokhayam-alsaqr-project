<?php
/**
 * نقطة عامة (بدون تسجيل دخول) بترجع بس أسماء المربعات/المناطق،
 * تستخدمها صفحة التسجيل العامة (register.html) لتعبئة قائمة الاختيار.
 * ما بترجع أي بيانات حساسة — بس id + name.
 */

require_once __DIR__ . '/../includes/response.php';
require_once __DIR__ . '/../config/db.php';

$stmt = $pdo->query('SELECT id, name FROM zones ORDER BY name ASC');
respond(['zones' => $stmt->fetchAll()]);
