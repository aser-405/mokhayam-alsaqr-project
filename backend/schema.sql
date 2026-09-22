-- ============================================================
-- مخيم الصقر — نظام إدارة المساعدات
-- قاعدة البيانات: MySQL 8 / MariaDB 10.4+
-- استورد هالملف بالكامل مرة وحدة (phpMyAdmin أو mysql CLI)
-- ============================================================

CREATE DATABASE IF NOT EXISTS mokhayam_alsaqr
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE mokhayam_alsaqr;

-- ------------------------------------------------------------
-- المستخدمون (موظفو الإدارة)
-- ------------------------------------------------------------
CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120)  NOT NULL,
  email         VARCHAR(190)  NOT NULL UNIQUE,
  password_plain VARCHAR(255) NOT NULL,   -- ⚠️ نص عادي بدون تشفير (وضع تطوير فقط، شوف README.md)
  role          ENUM('مدير','مدخل بيانات') NOT NULL DEFAULT 'مدخل بيانات',
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- إذا كنت استوردت النسخة القديمة من الجدول مسبقًا (فيها عمود password_hash)،
-- شغّل هالسطر بدل ما تعيد إنشاء الجدول من الصفر:
-- ALTER TABLE users CHANGE password_hash password_plain VARCHAR(255) NOT NULL;
-- وإذا كان عندك مستخدمين بدور 'موظف' من نسخة أقدم:
-- ALTER TABLE users MODIFY role ENUM('مدير','مدخل بيانات') NOT NULL DEFAULT 'مدخل بيانات';
-- UPDATE users SET role = 'مدخل بيانات' WHERE role = 'موظف';

-- ------------------------------------------------------------
-- إعدادات النظام (مفتاح/قيمة) — تستخدم لتخزين صلاحيات دور "مدخل بيانات"
-- ------------------------------------------------------------
CREATE TABLE settings (
  setting_key   VARCHAR(100) PRIMARY KEY,
  setting_value TEXT NOT NULL
) ENGINE=InnoDB;

-- الصفحات المسموحة افتراضيًا لدور "مدخل بيانات" (الإدارة تقدر تغيّرها من صفحة الإعدادات)
INSERT INTO settings (setting_key, setting_value) VALUES
('data_entry_allowed_pages', '["dashboard","families","join-requests"]');

-- ------------------------------------------------------------
-- الموقع الجغرافي (مربعات/مناطق المخيم) — قابلة للإضافة من لوحة التحكم
-- ------------------------------------------------------------
CREATE TABLE zones (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(80)  NOT NULL UNIQUE,   -- مثال: مربع أ، الحي الشرقي...
  color       VARCHAR(20)  NOT NULL DEFAULT 'gold',
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- العائلات
-- ------------------------------------------------------------
CREATE TABLE families (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  card_number       VARCHAR(20)   NOT NULL UNIQUE,   -- يُنشأ تلقائيًا: FAM-00001
  head_name         VARCHAR(150)  NOT NULL,
  head_id_number    VARCHAR(20)   NOT NULL UNIQUE,
  head_gender       ENUM('ذكر','أنثى') NULL,
  head_birthdate    DATE          NULL,              -- اختياري (كثير من كشوفات الإسكان ما فيها تاريخ ميلاد)
  head_age          INT GENERATED ALWAYS AS (TIMESTAMPDIFF(YEAR, head_birthdate, CURDATE())) VIRTUAL,
  phone             VARCHAR(20)   NULL,
  zone_id           INT UNSIGNED  NULL,               -- المربع/المنطقة بالمخيم
  marital_status    ENUM('أعزب','متزوج','مطلق','أرمل') NOT NULL DEFAULT 'متزوج',
  spouse_name       VARCHAR(150)  NULL,
  spouse_id_number  VARCHAR(20)   NULL,
  spouse_birthdate  DATE          NULL,
  member_count      SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP     NULL ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL,
  INDEX (head_name)
) ENGINE=InnoDB;
-- ترقية لقاعدة قديمة:
-- ALTER TABLE families ADD COLUMN head_age INT GENERATED ALWAYS AS (TIMESTAMPDIFF(YEAR, head_birthdate, CURDATE())) VIRTUAL AFTER head_birthdate;
-- ALTER TABLE families MODIFY head_birthdate DATE NULL;
-- ALTER TABLE families ADD COLUMN phone VARCHAR(20) NULL AFTER head_age;
-- ALTER TABLE families ADD COLUMN head_gender ENUM('ذكر','أنثى') NULL AFTER head_id_number;
-- ALTER TABLE families ADD COLUMN zone_id INT UNSIGNED NULL AFTER phone;
-- ALTER TABLE families ADD FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL;
-- ALTER TABLE families ADD COLUMN updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- ------------------------------------------------------------
-- الفئات الخاصة (قابلة للإضافة من لوحة التحكم)
-- ------------------------------------------------------------
CREATE TABLE special_categories (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(80)  NOT NULL UNIQUE,
  color       VARCHAR(20)  NOT NULL DEFAULT 'gold',   -- gold / copper / teal / slate / burgundy
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- الأفراد (كل فرد تابع لعائلة)
-- ------------------------------------------------------------
CREATE TABLE individuals (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  family_id           INT UNSIGNED NOT NULL,
  full_name           VARCHAR(150) NOT NULL,
  id_number           VARCHAR(20)  NOT NULL UNIQUE,
  birthdate           DATE         NOT NULL,
  age                 INT GENERATED ALWAYS AS (TIMESTAMPDIFF(YEAR, birthdate, CURDATE())) VIRTUAL,
  gender              ENUM('ذكر','أنثى') NOT NULL,
  relation            ENUM('رب الأسرة','الزوجة','ابن','ابنة','الجد','الجدة','أخرى') NOT NULL,
  special_category_id INT UNSIGNED NULL,   -- NULL = بدون فئة خاصة
  created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP    NULL ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  FOREIGN KEY (special_category_id) REFERENCES special_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;
-- ترقية لقاعدة قديمة:
-- ALTER TABLE individuals ADD COLUMN age INT GENERATED ALWAYS AS (TIMESTAMPDIFF(YEAR, birthdate, CURDATE())) VIRTUAL AFTER birthdate;
-- ALTER TABLE individuals ADD COLUMN updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- ------------------------------------------------------------
-- أنواع المساعدات
-- ------------------------------------------------------------
CREATE TABLE aid_types (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  category    ENUM('غذائي','نظافة','رعاية أطفال','إغاثة','تجهيزات') NOT NULL,
  color       VARCHAR(20)  NOT NULL DEFAULT 'gold',   -- gold / copper / teal / slate / burgundy
  notes       VARCHAR(255) NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- سجل عمليات التوزيع
-- ------------------------------------------------------------
CREATE TABLE distributions (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  family_id      INT UNSIGNED NOT NULL,
  aid_type_id    INT UNSIGNED NOT NULL,
  quantity       SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  distributed_at DATE         NOT NULL,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  FOREIGN KEY (aid_type_id) REFERENCES aid_types(id) ON DELETE RESTRICT,
  UNIQUE KEY uniq_family_aidtype_date (family_id, aid_type_id, distributed_at),
  INDEX (distributed_at),
  INDEX (family_id)
) ENGINE=InnoDB;
-- ترقية لقاعدة قديمة (إذا الجدول موجود مسبقًا بدون هالقيد):
-- ALTER TABLE distributions ADD UNIQUE KEY uniq_family_aidtype_date (family_id, aid_type_id, distributed_at);

-- ------------------------------------------------------------
-- طلبات الانضمام (بانتظار موافقة الإدارة)
-- ------------------------------------------------------------
CREATE TABLE join_requests (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  request_code      VARCHAR(20)  NOT NULL UNIQUE,   -- مثال: A-490271
  head_name         VARCHAR(150) NOT NULL,          -- الاسم رباعي
  head_id_number    VARCHAR(20)  NOT NULL,
  head_birthdate    DATE         NOT NULL,
  phone1            VARCHAR(20)  NOT NULL,
  phone2            VARCHAR(20)  NULL,
  marital_status    ENUM('أعزب','متزوج','مطلق','أرمل') NOT NULL DEFAULT 'متزوج',
  health_status     VARCHAR(255) NULL,              -- ملاحظات عن الحالة الصحية لرب الأسرة أو العائلة
  spouse_name       VARCHAR(150) NULL,
  spouse_id_number  VARCHAR(20)  NULL,
  spouse_birthdate  DATE         NULL,
  member_count      SMALLINT UNSIGNED NOT NULL DEFAULT 1,  -- عدد أفراد الأسرة الإجمالي
  male_count        SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  female_count      SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  zone_id           INT UNSIGNED NULL,               -- المربع/المنطقة يلي اختارها مقدّم الطلب
  status            ENUM('قيد المراجعة','مقبول','مرفوض') NOT NULL DEFAULT 'قيد المراجعة',
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL
) ENGINE=InnoDB;
-- ترقية لقاعدة قديمة:
-- ALTER TABLE join_requests ADD COLUMN zone_id INT UNSIGNED NULL AFTER female_count;
-- ALTER TABLE join_requests ADD FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL;

-- تفصيل أفراد الأسرة المذكورين بطلب الانضمام (اسم + عمر لكل فرد)
CREATE TABLE join_request_members (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  join_request_id   INT UNSIGNED NOT NULL,
  full_name         VARCHAR(150) NOT NULL,
  age               TINYINT UNSIGNED NOT NULL,
  FOREIGN KEY (join_request_id) REFERENCES join_requests(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- شكاوى من صفحة الهبوط العامة (مخيم الصقر - landing page)
-- ------------------------------------------------------------
CREATE TABLE complaints (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  phone       VARCHAR(20)  NOT NULL,
  type        VARCHAR(100) NOT NULL,
  message     TEXT         NOT NULL,
  status      ENUM('جديدة','تمت المراجعة') NOT NULL DEFAULT 'جديدة',
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- ملاحظة: ما في أي بيانات تجريبية/وهمية بهالنسخة — القاعدة فاضية بالكامل.
-- كل الجداول (العائلات، الأفراد، أنواع المساعدات، الفئات الخاصة، سجل التوزيع)
-- بتتعبى فقط من خلال الفورمات الحقيقية بالواجهة.
-- ============================================================

-- ------------------------------------------------------------
-- ترقية لقاعدة بيانات قديمة (إذا كنت مستورد نسخة سابقة فيها عمود
-- individuals.special_category كنص/ENUM بدل special_category_id):
-- ------------------------------------------------------------
-- CREATE TABLE special_categories (
--   id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
--   name VARCHAR(80) NOT NULL UNIQUE,
--   color VARCHAR(20) NOT NULL DEFAULT 'gold',
--   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
-- ) ENGINE=InnoDB;
-- ALTER TABLE individuals ADD COLUMN special_category_id INT UNSIGNED NULL AFTER relation;
-- ALTER TABLE individuals ADD FOREIGN KEY (special_category_id) REFERENCES special_categories(id) ON DELETE SET NULL;
-- ALTER TABLE individuals DROP COLUMN special_category;
-- DELETE FROM aid_types; -- إذا بدك تشيل بيانات النسخة التجريبية القديمة
