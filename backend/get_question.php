<?php
require_once 'db_connect.php';

// Get User ID
$userId = $_GET['user_id'] ?? null;

if (!$userId) {
    echo json_encode(['error' => 'User ID required']);
    exit;
}

// 1. Fetch User Configuration
$stmt = $pdo->prepare("SELECT grade_level, active_subjects, custom_prompt_active, custom_prompt_text, streak FROM users WHERE id = ?");
$stmt->execute([$userId]);
$user = $stmt->fetch();

if (!$user) {
    echo json_encode(['error' => 'User not found']);
    exit;
}

$generatedQuestion = null;

// 2. Hybrid Logic: Try AI if Custom Prompt is Active
if ($user['custom_prompt_active'] && !empty($user['custom_prompt_text'])) {
    $apiKey = getenv('GEMINI_API_KEY'); // Ensure this is set in your server env
    
    if ($apiKey) {
        // Prompt updated to request 10 categorized questions with all subjects
        $promptText = "Génère 10 questions scolaires distinctes niveau " . $user['grade_level'] . " sur le sujet : '" . $user['custom_prompt_text'] . "'. " .
                      "Pour chaque question, ajoute une 'category' courte (ex: Multiplication, Conjugaison, Grammaire, Géométrie...). " .
                      "Format JSON strict attendu (Tableau d'objets) : " .
                      "[ { \"subject\": \"MATHS\", \"FRANCAIS\", \"ANGLAIS\", \"HISTOIRE\", \"GEO\", \"PHYSIQUE\" ou \"SVT\", \"category\": \"...\", \"question_text\": \"...\", \"options\": [\"...\", \"...\", \"...\", \"...\"], \"correct_index\": 0-3, \"explanation\": \"...\" }, ... ]";

        $apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" . $apiKey;

        $payload = [
            "contents" => [
                ["parts" => [["text" => $promptText]]]
            ],
            "generationConfig" => [
                "responseMimeType" => "application/json"
            ]
        ];

        $ch = curl_init($apiUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200 && $response) {
            $jsonResponse = json_decode($response, true);
            // Extract text from Gemini response structure
            if (isset($jsonResponse['candidates'][0]['content']['parts'][0]['text'])) {
                $rawContent = $jsonResponse['candidates'][0]['content']['parts'][0]['text'];
                $aiQuestionsArray = json_decode($rawContent, true);
                
                if ($aiQuestionsArray && is_array($aiQuestionsArray) && count($aiQuestionsArray) > 0) {
                    
                    // SAVE BATCH TO DB
                    $insertSql = "INSERT INTO question_bank (subject, grade_level, difficulty, category, question_text, options_json, correct_index, explanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
                    $insertStmt = $pdo->prepare($insertSql);

                    foreach ($aiQuestionsArray as $aiQ) {
                         // Default values if AI misses a field
                         $subj = $aiQ['subject'] ?? 'AUTRE';
                         $cat = $aiQ['category'] ?? 'Général';
                         $diff = 'MEDIUM'; // Default AI difficulty
                         $qText = $aiQ['question_text'];
                         $opts = json_encode($aiQ['options'], JSON_UNESCAPED_UNICODE);
                         $corrIdx = $aiQ['correct_index'];
                         $expl = $aiQ['explanation'];

                         try {
                            $insertStmt->execute([
                                $subj, 
                                $user['grade_level'], 
                                $diff, 
                                $cat, 
                                $qText, 
                                $opts, 
                                $corrIdx, 
                                $expl
                            ]);
                         } catch (Exception $e) {
                             // Ignore duplicate or error, continue loop
                         }
                    }

                    // Return the first one as the current question
                    $firstQ = $aiQuestionsArray[0];
                    $generatedQuestion = [
                        'id' => 'ai_batch_' . uniqid(),
                        'source' => 'AI',
                        'subject' => $firstQ['subject'] ?? 'CUSTOM',
                        'difficulty' => 'ADAPTIVE',
                        'category' => $firstQ['category'] ?? 'Général',
                        'question_text' => $firstQ['question_text'],
                        'options' => $firstQ['options'],
                        'correct_index' => $firstQ['correct_index'],
                        'explanation' => $firstQ['explanation']
                    ];
                }
            }
        }
    }
}

// 3. Fallback: Local Question Bank
if (!$generatedQuestion) {
    // Determine Difficulty based on Streak
    $difficulty = 'MEDIUM';
    if ($user['streak'] > 3) $difficulty = 'HARD';
    
    // Parse Active Subjects
    $subjects = json_decode($user['active_subjects'], true);
    if (!$subjects) $subjects = ['MATHS'];
    
    // Build SQL with dynamic subjects
    $placeholders = implode(',', array_fill(0, count($subjects), '?'));
    
    // Add grade level to params
    $params = $subjects;
    $params[] = $user['grade_level'];
    $params[] = $difficulty;

    // Prioritize specific questions if category filtering was implemented, 
    // but for now we pick random from available valid questions
    $sql = "SELECT * FROM question_bank 
            WHERE subject IN ($placeholders) 
            AND grade_level = ? 
            AND difficulty = ? 
            ORDER BY RAND() LIMIT 1";

    $qStmt = $pdo->prepare($sql);
    $qStmt->execute($params);
    $dbQuestion = $qStmt->fetch();

    if (!$dbQuestion) {
        // Ultimate Fallback if filters are too strict (e.g. no HARD questions found)
        $fallbackSql = "SELECT * FROM question_bank WHERE grade_level = ? ORDER BY RAND() LIMIT 1";
        $fbStmt = $pdo->prepare($fallbackSql);
        $fbStmt->execute([$user['grade_level']]);
        $dbQuestion = $fbStmt->fetch();
    }

    if ($dbQuestion) {
        $generatedQuestion = [
            'id' => $dbQuestion['id'],
            'source' => 'DB',
            'subject' => $dbQuestion['subject'],
            'difficulty' => $dbQuestion['difficulty'],
            'category' => $dbQuestion['category'],
            'question_text' => $dbQuestion['question_text'],
            'options' => json_decode($dbQuestion['options_json']),
            'correct_index' => (int)$dbQuestion['correct_index'],
            'explanation' => $dbQuestion['explanation']
        ];
    } else {
        // Last resort error
        echo json_encode(['error' => 'No questions available']);
        exit;
    }
}

echo json_encode(['success' => true, 'data' => $generatedQuestion]);
?>