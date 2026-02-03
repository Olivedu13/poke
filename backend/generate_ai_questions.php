<?php
// backend/generate_ai_questions.php
// Génère et enregistre les questions IA en base de données
require_once 'protected_setup.php';

function send_response($data) {
    ob_clean();
    echo json_encode($data);
    exit;
}

// Générateur de questions intelligent avec adaptation au niveau scolaire
function generateSmartQuestions($topic, $grade, $count = 10) {
    $topic = strtolower(trim($topic));
    $questions = [];
    
    // Configuration par niveau scolaire
    $gradeConfig = [
        'CP' => ['math_range' => [1, 10], 'vocab_difficulty' => 'EASY'],
        'CE1' => ['math_range' => [1, 20], 'vocab_difficulty' => 'EASY'],
        'CE2' => ['math_range' => [1, 50], 'vocab_difficulty' => 'MEDIUM'],
        'CM1' => ['math_range' => [1, 100], 'vocab_difficulty' => 'MEDIUM'],
        'CM2' => ['math_range' => [1, 100], 'vocab_difficulty' => 'HARD'],
        '6EME' => ['math_range' => [1, 100], 'vocab_difficulty' => 'HARD']
    ];
    
    $config = $gradeConfig[$grade] ?? $gradeConfig['CE1'];
    
    // ========== TABLES DE MULTIPLICATION ==========
    if (preg_match('/table.*?(\d+)/i', $topic, $matches)) {
        $num = (int)$matches[1];
        $maxMultiplier = ($grade === 'CP' || $grade === 'CE1') ? 5 : 10;
        
        for ($i = 0; $i < min($count, 10); $i++) {
            $mul = rand(1, $maxMultiplier);
            $res = $num * $mul;
            
            // Génération des distracteurs intelligents
            $options = [$res];
            $options[] = $res + $num; // Erreur classique : addition au lieu de multiplication
            $options[] = $res - 1;    // Erreur de calcul -1
            $options[] = $res + rand(2, 5); // Erreur aléatoire
            
            $options = array_unique($options);
            shuffle($options);
            $correctIndex = array_search($res, $options);
            
            $difficulty = ($mul <= 5) ? 'EASY' : (($mul <= 7) ? 'MEDIUM' : 'HARD');
            
            $questions[] = [
                'subject' => 'MATHS',
                'difficulty' => $difficulty,
                'category' => "Table de $num",
                'text' => "Combien font $num × $mul ?",
                'options' => array_values($options),
                'correct' => $correctIndex,
                'expl' => "$num fois $mul est égal à $res."
            ];
        }
    }
    
    // ========== MOIS EN ANGLAIS ==========
    elseif (preg_match('/mois.*anglais/i', $topic)) {
        $months = [
            ['fr' => 'Janvier', 'en' => 'January'],
            ['fr' => 'Février', 'en' => 'February'],
            ['fr' => 'Mars', 'en' => 'March'],
            ['fr' => 'Avril', 'en' => 'April'],
            ['fr' => 'Mai', 'en' => 'May'],
            ['fr' => 'Juin', 'en' => 'June'],
            ['fr' => 'Juillet', 'en' => 'July'],
            ['fr' => 'Août', 'en' => 'August'],
            ['fr' => 'Septembre', 'en' => 'September'],
            ['fr' => 'Octobre', 'en' => 'October'],
            ['fr' => 'Novembre', 'en' => 'November'],
            ['fr' => 'Décembre', 'en' => 'December']
        ];
        
        $selected = array_slice($months, 0, min($count, 12));
        foreach ($selected as $month) {
            $correct = $month['en'];
            $wrongOptions = array_diff(array_column($months, 'en'), [$correct]);
            shuffle($wrongOptions);
            $options = array_merge([$correct], array_slice($wrongOptions, 0, 3));
            shuffle($options);
            $correctIndex = array_search($correct, $options);
            
            $difficulty = $config['vocab_difficulty'];
            
            $questions[] = [
                'subject' => 'ANGLAIS',
                'difficulty' => $difficulty,
                'category' => 'Mois de l\'année',
                'text' => "Comment dit-on '{$month['fr']}' en anglais ?",
                'options' => $options,
                'correct' => $correctIndex,
                'expl' => "Le mois de {$month['fr']} se dit '{$correct}' en anglais."
            ];
        }
    }
    
    // ========== JOURS EN ANGLAIS ==========
    elseif (preg_match('/jour.*anglais/i', $topic)) {
        $days = [
            ['fr' => 'Lundi', 'en' => 'Monday'],
            ['fr' => 'Mardi', 'en' => 'Tuesday'],
            ['fr' => 'Mercredi', 'en' => 'Wednesday'],
            ['fr' => 'Jeudi', 'en' => 'Thursday'],
            ['fr' => 'Vendredi', 'en' => 'Friday'],
            ['fr' => 'Samedi', 'en' => 'Saturday'],
            ['fr' => 'Dimanche', 'en' => 'Sunday']
        ];
        
        foreach ($days as $day) {
            $correct = $day['en'];
            $wrongOptions = array_diff(array_column($days, 'en'), [$correct]);
            shuffle($wrongOptions);
            $options = array_merge([$correct], array_slice($wrongOptions, 0, 3));
            shuffle($options);
            $correctIndex = array_search($correct, $options);
            
            $difficulty = ($config['vocab_difficulty'] === 'HARD') ? 'MEDIUM' : 'EASY';
            
            $questions[] = [
                'subject' => 'ANGLAIS',
                'difficulty' => $difficulty,
                'category' => 'Jours de la semaine',
                'text' => "Comment dit-on '{$day['fr']}' en anglais ?",
                'options' => $options,
                'correct' => $correctIndex,
                'expl' => "Le jour {$day['fr']} se dit '{$correct}' en anglais."
            ];
        }
    }
    
    // ========== ADDITIONS SIMPLES ==========
    elseif (preg_match('/addition/i', $topic)) {
        $max = $config['math_range'][1];
        
        for ($i = 0; $i < min($count, 15); $i++) {
            $a = rand(1, $max);
            $b = rand(1, $max);
            $res = $a + $b;
            
            $options = [$res, $res + 1, $res - 1, $res + rand(2, 5)];
            $options = array_unique($options);
            shuffle($options);
            $correctIndex = array_search($res, $options);
            
            $difficulty = ($res <= 10) ? 'EASY' : (($res <= 30) ? 'MEDIUM' : 'HARD');
            
            $questions[] = [
                'subject' => 'MATHS',
                'difficulty' => $difficulty,
                'category' => 'Additions',
                'text' => "Combien font $a + $b ?",
                'options' => array_values($options),
                'correct' => $correctIndex,
                'expl' => "$a plus $b égale $res."
            ];
        }
    }
    
    // ========== SOUSTRACTIONS ==========
    elseif (preg_match('/soustraction/i', $topic)) {
        $max = $config['math_range'][1];
        
        for ($i = 0; $i < min($count, 15); $i++) {
            $a = rand(5, $max);
            $b = rand(1, $a); // Pour éviter les résultats négatifs
            $res = $a - $b;
            
            $options = [$res, $res + 1, $res - 1, $res + rand(2, 4)];
            $options = array_unique(array_filter($options, fn($v) => $v >= 0));
            shuffle($options);
            $correctIndex = array_search($res, $options);
            
            $difficulty = ($res <= 10) ? 'EASY' : (($res <= 30) ? 'MEDIUM' : 'HARD');
            
            $questions[] = [
                'subject' => 'MATHS',
                'difficulty' => $difficulty,
                'category' => 'Soustractions',
                'text' => "Combien font $a - $b ?",
                'options' => array_values($options),
                'correct' => $correctIndex,
                'expl' => "$a moins $b égale $res."
            ];
        }
    }
    
    // ========== QUESTION GÉNÉRIQUE ==========
    else {
        $questions[] = [
            'subject' => 'GENERAL',
            'difficulty' => $config['vocab_difficulty'],
            'category' => 'Thématique personnalisée',
            'text' => "Question sur le thème : $topic",
            'options' => ['Réponse A', 'Réponse B', 'Réponse C', 'Réponse D'],
            'correct' => rand(0, 3),
            'expl' => "Question générée automatiquement sur le thème personnalisé."
        ];
    }
    
    return $questions;
}

try {
    // Récupérer les paramètres
    $topic = $input['topic'] ?? '';
    $count = isset($input['count']) ? (int)$input['count'] : 10;
    
    if (empty($topic)) {
        throw new Exception("Le sujet est requis");
    }
    
    // Charger l'utilisateur
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    
    if (!$user) {
        throw new Exception("Utilisateur non trouvé");
    }
    
    $grade = $user['grade_level'] ?? 'CE1';
    
    // Générer les questions
    $generatedQuestions = generateSmartQuestions($topic, $grade, $count);
    
    if (empty($generatedQuestions)) {
        throw new Exception("Aucune question n'a pu être générée pour ce sujet");
    }
    
    // Supprimer les anciennes questions IA de l'utilisateur
    $deleteStmt = $pdo->prepare("DELETE FROM question_bank WHERE source_override = 'IA' AND grade_level = ?");
    $deleteStmt->execute([$grade]);
    
    // Insérer les nouvelles questions en base
    $insertStmt = $pdo->prepare("
        INSERT INTO question_bank 
        (question_text, options_json, correct_index, explanation, subject, difficulty, category, grade_level, source_override)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'IA')
    ");
    
    $inserted = 0;
    foreach ($generatedQuestions as $q) {
        $optionsJson = json_encode($q['options'], JSON_UNESCAPED_UNICODE);
        
        $insertStmt->execute([
            $q['text'],
            $optionsJson,
            $q['correct'],
            $q['expl'],
            $q['subject'],
            $q['difficulty'],
            $q['category'],
            $grade
        ]);
        
        $inserted++;
    }
    
    send_response([
        'success' => true,
        'message' => "$inserted questions générées et enregistrées",
        'count' => $inserted,
        'grade' => $grade,
        'topic' => $topic
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    send_response([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
