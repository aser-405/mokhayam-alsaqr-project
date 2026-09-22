<?php
require_once __DIR__ . '/../includes/response.php';
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_page_access('dashboard');

$totalFamilies = (int) $pdo->query('SELECT COUNT(*) FROM families')->fetchColumn();
$totalIndividuals = (int) $pdo->query('SELECT COALESCE(SUM(member_count),0) FROM families')->fetchColumn();
$totalAidTypes = (int) $pdo->query('SELECT COUNT(*) FROM aid_types')->fetchColumn();
$totalDistributions = (int) $pdo->query('SELECT COUNT(*) FROM distributions')->fetchColumn();

$thisMonth = (int) $pdo->query(
    "SELECT COUNT(*) FROM distributions WHERE distributed_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')"
)->fetchColumn();

$thisWeek = (int) $pdo->query(
    "SELECT COUNT(*) FROM distributions WHERE YEARWEEK(distributed_at, 1) = YEARWEEK(CURDATE(), 1)"
)->fetchColumn();

$today = (int) $pdo->query(
    "SELECT COUNT(*) FROM distributions WHERE distributed_at = CURDATE()"
)->fetchColumn();

$avgMembers = $totalFamilies > 0 ? round($totalIndividuals / $totalFamilies, 1) : 0;

$familiesWithAid = (int) $pdo->query(
    'SELECT COUNT(DISTINCT family_id) FROM distributions'
)->fetchColumn();

$avgDistPerBeneficiaryFamily = $familiesWithAid > 0 ? round($totalDistributions / $familiesWithAid, 1) : 0;

$coveragePercent = $totalFamilies > 0 ? round(($familiesWithAid / $totalFamilies) * 100) : 0;

respond([
    'total_families'        => $totalFamilies,
    'total_individuals'     => $totalIndividuals,
    'total_aid_types'       => $totalAidTypes,
    'total_distributions'   => $totalDistributions,
    'distributions_month'   => $thisMonth,
    'distributions_week'    => $thisWeek,
    'distributions_today'   => $today,
    'avg_members_per_family'=> $avgMembers,
    'avg_dist_per_beneficiary_family' => $avgDistPerBeneficiaryFamily,
    'families_with_aid'     => $familiesWithAid,
    'coverage_percent'      => $coveragePercent,
]);
