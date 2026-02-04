<?php
require_once 'db_connect.php';

// Sécurité basique
// if (!isset($_GET['force'])) die("Ajoutez ?force=1 à l'URL pour confirmer.");

echo "<h1>🛠️ Initialisation des Données du Jeu (V3 - Pack Extension)</h1>";

try {
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // ==========================================
    // 1. CRÉATION & REMPLISSAGE TABLE ITEMS
    // ==========================================
    
    // (Conserve la structure Items existante)
    // ... code item table init ignored for brevity as it was correct ...
    // On assume que la table Items est déjà OK via V2, sinon la recopier.
    // Pour cet update, on se focus sur les QUESTIONS pour régler le problème de répétition.

    // ==========================================
    // 2. INSERTION DES QUESTIONS (SEED)
    // ==========================================

    echo "<h2>📚 Banque de Questions (Extension)</h2>";

    $questions = [
        // MATHS CP/CE1
        ['MATHS', 'CP', 'EASY', 'Addition', '1 + 1 = ?', ['1', '2', '3', '0'], 1, '1 plus 1 font 2.'],
        ['MATHS', 'CP', 'EASY', 'Suite', 'Après 3 vient...', ['4', '5', '2', '6'], 0, '1, 2, 3, 4 !'],
        ['MATHS', 'CE1', 'EASY', 'Addition', 'Combien font 15 + 5 ?', ['18', '20', '25', '10'], 1, '15 plus 5 égale 20.'],
        ['MATHS', 'CE1', 'MEDIUM', 'Soustraction', 'Combien font 30 - 10 ?', ['20', '10', '15', '25'], 0, '30 moins 10 égale 20.'],
        ['MATHS', 'CE1', 'EASY', 'Géométrie', 'Combien de côtés a un triangle ?', ['3', '4', '2', '5'], 0, 'Un triangle a 3 côtés (tri-angle).'],
        ['MATHS', 'CE1', 'HARD', 'Multiplication', 'Combien font 2 x 5 ?', ['12', '7', '10', '25'], 2, '2 fois 5, c\'est 5 + 5 = 10.'],
        ['MATHS', 'CE1', 'MEDIUM', 'Heure', 'La petite aiguille indique les...', ['Minutes', 'Heures', 'Secondes', 'Jours'], 1, 'La petite indique les heures.'],
        ['MATHS', 'CE2', 'EASY', 'Calcul', 'Double de 10 ?', ['20', '15', '5', '100'], 0, '10 + 10 = 20.'],

        // FRANCAIS CE1/CE2
        ['FRANCAIS', 'CE1', 'EASY', 'Grammaire', 'Trouve le verbe : "Le chien court".', ['Le', 'chien', 'court', 'aucun'], 2, 'C\'est l\'action de courir.'],
        ['FRANCAIS', 'CE1', 'MEDIUM', 'Pluriel', 'Quel est le pluriel de "cheval" ?', ['chevals', 'chevaux', 'chevaus', 'chevales'], 1, 'Les mots en -al font souvent leur pluriel en -aux.'],
        ['FRANCAIS', 'CE2', 'MEDIUM', 'Conjugaison', 'Futur de "Je chante" ?', ['Je chantais', 'Je chanterai', 'J\'ai chanté', 'Je chante'], 1, 'Le futur exprime ce qui va se passer : Je chanterai demain.'],
        ['FRANCAIS', 'CE2', 'HARD', 'Orthographe', 'Quelle est la bonne écriture ?', ['Haricot', 'Aricot', 'Harico', 'Arricot'], 0, 'Haricot prend un H.'],

        // MATHS CM1/CM2
        ['MATHS', 'CM1', 'MEDIUM', 'Multiplication', 'Combien font 6 x 7 ?', ['42', '36', '48', '54'], 0, '6 fois 7 égale 42.'],
        ['MATHS', 'CM1', 'HARD', 'Géométrie', 'Un angle droit fait...', ['45°', '90°', '180°', '100°'], 1, 'Un angle droit mesure 90 degrés.'],
        ['MATHS', 'CM2', 'HARD', 'Division', 'Quel est la moitié de 150 ?', ['60', '70', '75', '80'], 2, '75 + 75 = 150.'],
        ['MATHS', 'CM2', 'MEDIUM', 'Décimaux', '0,5 est égal à...', ['1/2', '1/4', '1/3', '1/10'], 0, '0,5 c\'est la moitié, donc un demi.'],
        
        // HISTOIRE / GEO
        ['HISTOIRE', 'CM1', 'MEDIUM', 'Rois', 'Qui était Louis XIV ?', ['Le Roi Soleil', 'Le Roi Lune', 'Un Président', 'Un Chevalier'], 0, 'Louis XIV est surnommé le Roi Soleil.'],
        ['HISTOIRE', 'CM2', 'HARD', 'Guerres', 'Date fin 2nde Guerre Mondiale ?', ['1918', '1945', '1789', '2000'], 1, 'L\'armistice a été signé en 1945.'],
        ['GEO', 'CM2', 'EASY', 'Capitales', 'Quelle est la capitale de la France ?', ['Lyon', 'Marseille', 'Paris', 'Bordeaux'], 2, 'C\'est Paris.'],
        ['GEO', '6EME', 'MEDIUM', 'Continents', 'L\'Amazonie est en...', ['Afrique', 'Asie', 'Amérique du Sud', 'Europe'], 2, 'Principalement au Brésil.'],

        // ANGLAIS
        ['ANGLAIS', '6EME', 'EASY', 'Vocabulaire', 'Que veut dire "Blue" ?', ['Rouge', 'Vert', 'Bleu', 'Jaune'], 2, 'Blue signifie Bleu.'],
        ['ANGLAIS', '5EME', 'MEDIUM', 'Verbes', 'Past simple de "To Go" ?', ['Goed', 'Went', 'Gone', 'Going'], 1, 'Go est irrégulier : I went.'],
        ['ANGLAIS', '4EME', 'HARD', 'Vocabulaire', '"Library" signifie ?', ['Librairie', 'Bibliothèque', 'Libre', 'Laboratoire'], 1, 'Faux ami : Library = Bibliothèque.'],

        // SCIENCES
        ['SVT', '5EME', 'MEDIUM', 'Corps humain', 'Combien d\'os a le corps humain adulte ?', ['100', '206', '350', '500'], 1, 'Un adulte a 206 os.'],
        ['PHYSIQUE', '4EME', 'MEDIUM', 'Atomes', 'Symbole de l\'Oxygène ?', ['Ox', 'O', 'Y', 'Ge'], 1, 'O comme Oxygène.'],
        ['PHYSIQUE', '3EME', 'HARD', 'Vitesse', 'Vitesse de la lumière ?', ['300 000 km/s', '340 m/s', '1000 km/h', 'Infini'], 0, 'Environ 300 000 km par seconde.'],
        ['SVT', '6EME', 'EASY', 'Animaux', 'La baleine est un...', ['Poisson', 'Mammifère', 'Reptile', 'Oiseau'], 1, 'Elle allaite ses petits.'],

        // CULTURE / GENERAL
        ['FRANCAIS', 'CM1', 'EASY', 'Poésie', 'Qui a écrit les Fables ?', ['La Fontaine', 'Molière', 'Hugo', 'Disney'], 0, 'Jean de La Fontaine.'],
        ['GEO', 'CE2', 'MEDIUM', 'France', 'Combien de régions en France ?', ['10', '13', '22', '50'], 1, 'Depuis 2016, il y a 13 régions en métropole.'],
        ['MATHS', '6EME', 'HARD', 'Périmètre', 'Périmètre carré côté 4cm ?', ['8cm', '12cm', '16cm', '20cm'], 2, '4 côtés x 4cm = 16cm.']
    ];

    $stmtQ = $pdo->prepare("INSERT INTO question_bank (subject, grade_level, difficulty, category, question_text, options_json, correct_index, explanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");

    $countQ = 0;
    foreach ($questions as $q) {
        // Check duplicate text to avoid spamming DB on refresh
        $check = $pdo->prepare("SELECT id FROM question_bank WHERE question_text = ?");
        $check->execute([$q[4]]);
        if (!$check->fetch()) {
            $stmtQ->execute([
                $q[0], $q[1], $q[2], $q[3], $q[4], json_encode($q[5], JSON_UNESCAPED_UNICODE), $q[6], $q[7]
            ]);
            $countQ++;
        }
    }
    echo "✅ " . $countQ . " nouvelles questions ajoutées.<br>";

    echo "<hr><h3>🎉 Base de données enrichie !</h3>";
    echo "<a href='/'>Retour au jeu</a>";

} catch (PDOException $e) {
    echo "❌ Erreur Critique : " . $e->getMessage();
}
?>
