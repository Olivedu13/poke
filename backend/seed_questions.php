<?php
// backend/seed_questions.php

// 1. Configuration Database
$host = 'db5019487862.hosting-data.io';
$db   = 'dbs15241915';
$user = 'dbu5468595';
$pass = 'Atc13001!!7452!!';
$charset = 'utf8mb4';


$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

header('Content-Type: text/plain');

try {
    // Connect to DB
    $pdo = new PDO($dsn, $user, $pass, $options);
    echo "Connected to Database.\n";

    // 2. Load JSON
    $jsonFile = __DIR__ . '/questions_data.json';
    if (!file_exists($jsonFile)) {
        throw new Exception("File questions_data.json not found.");
    }

    $jsonData = file_get_contents($jsonFile);
    $questions = json_decode($jsonData, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("Invalid JSON format.");
    }

    echo "Found " . count($questions) . " questions to import.\n";

    // 3. Prepare Statement
    $sql = "INSERT INTO question_bank 
            (subject, grade_level, difficulty, category, question_text, options_json, correct_index, explanation) 
            VALUES (:subject, :grade_level, :difficulty, :category, :question_text, :options_json, :correct_index, :explanation)";
    
    $stmt = $pdo->prepare($sql);

    // 4. Insert Loop
    $inserted = 0;
    foreach ($questions as $q) {
        // Encode options array back to JSON string for storage
        $optionsJsonStr = json_encode($q['options_json'], JSON_UNESCAPED_UNICODE);

        $stmt->execute([
            ':subject'       => $q['subject'],
            ':grade_level'   => $q['grade_level'],
            ':difficulty'    => $q['difficulty'],
            ':category'      => $q['category'] ?? null,
            ':question_text' => $q['question_text'],
            ':options_json'  => $optionsJsonStr,
            ':correct_index' => $q['correct_index'],
            ':explanation'   => $q['explanation']
        ]);
        $inserted++;
    }

    echo "Successfully inserted $inserted questions.\n";
    echo "Seeding Complete.";

} catch (\PDOException $e) {
    echo "Database Error: " . $e->getMessage();
} catch (\Exception $e) {
    echo "General Error: " . $e->getMessage();
}
?>