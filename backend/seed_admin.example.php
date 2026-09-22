<?php
/**
 * Copy this file to seed_admin.php, change the email and password, run it once,
 * then delete seed_admin.php from the server.
 */

require_once __DIR__ . '/config/db.php';

$name     = 'System Admin';
$email    = 'admin@example.com';
$password = 'CHANGE_THIS_PASSWORD';

$check = $pdo->prepare('SELECT id FROM users WHERE email = ?');
$check->execute([$email]);

if ($check->fetch()) {
    echo "Admin user already exists: {$email}";
    exit;
}

$stmt = $pdo->prepare('INSERT INTO users (name, email, password_plain, role) VALUES (?, ?, ?, ?)');
$stmt->execute([$name, $email, $password, 'مدير']);

echo "Admin user created successfully.\n";
echo "Email: {$email}\n";
echo "Delete seed_admin.php from the server now.\n";

