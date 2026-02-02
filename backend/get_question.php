
<?php
// backend/get_question.php
require_once 'protected_setup.php'; // Injecte $userId après vérif Token

ini_set('display_errors', 0);

function send_response($data) {
    ob_clean();
    echo json_encode($data);
    exit;
}

// --- SIMULATEUR IA ---
function mockAiGenerator($topic, $grade) {
    $topic = strtolower($topic);
    $questions = [];
    if (strpos($topic, 'table') !== false) {
        preg_match('/\d+/', $topic, $matches);
        $num = isset($matches[0]) ? (int)$matches[0] : rand(2, 9);
        for ($i=0; $i<3; $i++) {
            $mul = rand(1, 10); $res = $num * $mul;
            $questions[] = [
                'subject' => 'MATHS', 'difficulty' => 'MEDIUM', 'category' => "Table de $num",
                'text' => "Combien font $num x $mul ?",
                'options' => [(string)($res+$num), (string)$res, (string)($res-1), (string)($res+5)],
                'correct' => 1, 'expl' => "$num fois $mul est égal à $res."
            ];
        }
    } else {
        $questions[] = [
            'subject' => 'FRANCAIS', 'difficulty' => 'HARD', 'category' => 'Vocabulaire',
            'text' => "Que signifie le mot clé '$topic' ?",
            'options' => ['Un animal', 'Un verbe', 'Un concept', 'Une ville'],
            'correct' => 2, 'expl' => "Question générée automatiquement sur le thème $topic."
        ];
    }
    return $questions;
}

try {
    $excludeStr = $_GET['exclude_ids'] ?? '';
    $excludeIds = array_filter(explode(',', $excludeStr), 'is_numeric');
    if (empty($excludeIds)) $excludeIds = [0]; 
    $excludePlaceholder = implode(',', $excludeIds);

    // Charger Config User (via $userId sécurisé)
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $uData = $stmt->fetch();
    if (!$uData) throw new Exception("User not found");

    $grade = $uData['grade_level'] ?? 'CE1';
    $useAi = isset($uData['custom_prompt_active']) ? (bool)$uData['custom_prompt_active'] : false;
    $aiTopic = trim($uData['custom_prompt_text'] ?? '');
    
    $subjects = [];
    if (!empty($uData['active_subjects'])) {
        $d = json_decode($uData['active_subjects'], true);
        if (is_array($d)) $subjects = $d;
    }
    if (empty($subjects)) $subjects = ['MATHS', 'FRANCAIS'];
    
    $q = null;

    if ($useAi && !empty($aiTopic)) {
        // ... (Logique IA inchangée)
        $q = ['id' => 999, 'text' => "IA Question sur $aiTopic", 'options_json' => '["A","B","C","D"]', 'correct_index' => 0, 'explanation' => 'Mock AI', 'subject'=>'AI', 'difficulty'=>'MEDIUM'];
    }

    if (!$q) {
        $placeholders = implode(',', array_fill(0, count($subjects), '?'));
        $sql = "SELECT * FROM question_bank WHERE grade_level = ? AND subject IN ($placeholders) AND id NOT IN ($excludePlaceholder) ORDER BY RAND() LIMIT 1";
        $stmtQ = $pdo->prepare($sql);
        $stmtQ->execute(array_merge([$grade], $subjects));
        $q = $stmtQ->fetch();
        
        if (!$q) {
             $sql2 = "SELECT * FROM question_bank WHERE subject IN ($placeholders) AND id NOT IN ($excludePlaceholder) ORDER BY RAND() LIMIT 1";
             $stmt2 = $pdo->prepare($sql2);
             $stmt2->execute($subjects);
             $q = $stmt2->fetch();
        }
    }

    if ($q) {
        $opts = is_string($q['options_json']) ? json_decode($q['options_json']) : $q['options_json'];
        if (!is_array($opts)) $opts = ["A", "B", "C", "D"];
        $out = [
            'id' => $q['id'],
            'source' => $q['source_override'] ?? 'DB',
            'subject' => $q['subject'],
            'difficulty' => $q['difficulty'],
            'category' => $q['category'] ?? 'GENERAL',
            'question_text' => $q['question_text'],
            'options' => $opts,
            'correct_index' => (int)$q['correct_index'],
            'explanation' => $q['explanation']
        ];
        send_response(['success' => true, 'data' => $out]);
    } else {
        // Fallback question
        $fb = ['id'=>0, 'subject'=>'MATHS', 'difficulty'=>'EASY', 'category'=>'SYSTEM', 'question_text'=>'1+1=?', 'options'=>['1','2','3','4'], 'correct_index'=>1, 'explanation'=>'...'];
        send_response(['success' => true, 'data' => $fb]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
