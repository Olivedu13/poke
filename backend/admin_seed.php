<?php
require_once 'db_connect.php';

// Sécurité basique
// if (!isset($_GET['force'])) die("Ajoutez ?force=1 à l'URL pour confirmer.");

echo "<h1>🛠️ Initialisation des Données du Jeu (V2 - Avec Assets)</h1>";

try {
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // ==========================================
    // 1. CRÉATION & REMPLISSAGE TABLE ITEMS
    // ==========================================
    
    echo "<h2>📦 Gestion des Objets (Items)</h2>";

    // ON RESET LA TABLE POUR AJOUTER LA COLONNE IMAGE PROPREMENT
    $pdo->exec("DROP TABLE IF EXISTS `items`");

    // Création Table avec colonne IMAGE et COLLATION EXPLICITE
    $sqlTableItems = "CREATE TABLE `items` (
        `id` VARCHAR(50) NOT NULL,
        `name` VARCHAR(100) NOT NULL,
        `description` VARCHAR(255) NOT NULL,
        `price` INT(11) NOT NULL,
        `effect_type` VARCHAR(50) NOT NULL,
        `value` INT(11) NOT NULL,
        `rarity` ENUM('COMMON','UNCOMMON','RARE','EPIC','LEGENDARY') DEFAULT 'COMMON',
        `image` VARCHAR(100) NOT NULL DEFAULT 'pokeball.webp',
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    
    $pdo->exec($sqlTableItems);
    echo "✅ Table `items` recréée avec support des images et collation correcte.<br>";

    // Données Catalogue avec Images
    $catalogItems = [
        ['heal_r1', 'Potion de Soin (R1)', '+20% PV (1 Allié)', 50, 'HEAL', 20, 'COMMON', 'soin.webp'],
        ['heal_r2', 'Potion de Soin (R2)', '+40% PV (1 Allié)', 150, 'HEAL', 40, 'UNCOMMON', 'soin.webp'],
        ['heal_r3', 'Potion de Soin (R3)', '+60% PV (1 Allié)', 300, 'HEAL', 60, 'RARE', 'soin.webp'],
        ['heal_r4', 'Potion de Soin (R4)', '+80% PV (1 Allié)', 600, 'HEAL', 80, 'EPIC', 'soin.webp'],
        ['heal_r5', 'Potion de Soin (R5)', '+100% PV (Soin Total)', 1000, 'HEAL', 100, 'LEGENDARY', 'soin.webp'],

        ['team_r1', 'Soin Ultime (R1)', '+20% PV Équipe', 200, 'HEAL_TEAM', 20, 'UNCOMMON', 'soin_ultime.webp'],
        ['team_r2', 'Soin Ultime (R2)', '+40% PV Équipe', 400, 'HEAL_TEAM', 40, 'RARE', 'soin_ultime.webp'],
        ['team_r3', 'Soin Ultime (R3)', '+60% PV Équipe', 800, 'HEAL_TEAM', 60, 'EPIC', 'soin_ultime.webp'],
        ['team_r4', 'Soin Ultime (R4)', '+80% PV Équipe', 1500, 'HEAL_TEAM', 80, 'LEGENDARY', 'soin_ultime.webp'],
        ['team_r5', 'Soin Ultime (R5)', '+100% PV Équipe', 3000, 'HEAL_TEAM', 100, 'LEGENDARY', 'soin_ultime.webp'],

        ['atk_r1', 'Potion Attaque (R1)', '+20% Dégâts', 100, 'BUFF_ATK', 20, 'COMMON', 'attaque.webp'],
        ['atk_r2', 'Potion Attaque (R2)', '+40% Dégâts', 250, 'BUFF_ATK', 40, 'UNCOMMON', 'attaque.webp'],
        ['atk_r3', 'Potion Attaque (R3)', '+60% Dégâts', 500, 'BUFF_ATK', 60, 'RARE', 'attaque.webp'],
        ['atk_r4', 'Potion Attaque (R4)', '+80% Dégâts', 900, 'BUFF_ATK', 80, 'EPIC', 'attaque.webp'],
        ['atk_r5', 'Potion Attaque (R5)', '+100% Dégâts (x2)', 1500, 'BUFF_ATK', 100, 'LEGENDARY', 'attaque.webp'],

        ['def_r1', 'Potion Défense (R1)', 'Bloque 20% Dégâts', 100, 'BUFF_DEF', 20, 'COMMON', 'defense.webp'],
        ['def_r2', 'Potion Défense (R2)', 'Bloque 40% Dégâts', 250, 'BUFF_DEF', 40, 'UNCOMMON', 'defense.webp'],
        ['def_r3', 'Potion Défense (R3)', 'Bloque 60% Dégâts', 500, 'BUFF_DEF', 60, 'RARE', 'defense.webp'],
        ['def_r4', 'Potion Défense (R4)', 'Bloque 80% Dégâts', 1000, 'BUFF_DEF', 80, 'EPIC', 'defense.webp'],
        ['def_r5', 'Potion Défense (R5)', 'Immunité (1 tour)', 1500, 'BUFF_DEF', 100, 'LEGENDARY', 'defense.webp'],

        ['dmg_r1', 'Coup de Poing (R1)', '20% PV Ennemi', 150, 'DMG_FLAT', 20, 'COMMON', 'coup_poing.webp'],
        ['dmg_r2', 'Coup de Poing (R2)', '40% PV Ennemi', 350, 'DMG_FLAT', 40, 'UNCOMMON', 'coup_poing.webp'],
        ['dmg_r3', 'Coup de Poing (R3)', '60% PV Ennemi', 600, 'DMG_FLAT', 60, 'RARE', 'coup_poing.webp'],
        ['dmg_r4', 'Coup de Poing (R4)', '80% PV Ennemi', 1500, 'DMG_FLAT', 80, 'EPIC', 'coup_poing.webp'],
        ['dmg_r5', 'K.O Instantané', '100% PV Ennemi', 2500, 'DMG_FLAT', 100, 'LEGENDARY', 'coup_poing.webp'],

        ['evolution', 'Potion Évolution', 'Évolue au stade suivant', 2500, 'EVOLUTION', 1, 'EPIC', 'xp.webp'],
        ['evolution_ultime', 'Potion Ultime', 'Évolution Finale', 5000, 'EVOLUTION_MAX', 1, 'LEGENDARY', 'xp.webp'],

        ['sleep_r1', 'Poudre Dodo', 'Sommeil (1 tour)', 200, 'STATUS_SLEEP', 1, 'UNCOMMON', 'dodo.webp'],
        ['poison_r4', 'Venin Mortel', '-30% PV/tour', 800, 'STATUS_POISON', 30, 'EPIC', 'poison.webp'],

        ['mirror_r5', 'Miroir Magique', 'Renvoie l\'attaque', 2000, 'SPECIAL_MIRROR', 100, 'LEGENDARY', 'miroir.webp'],
        
        ['joker', 'Joker Savant', 'Passe une question', 300, 'JOKER', 1, 'COMMON', 'joker.webp'],
        ['xp_pack', 'Pack XP', '+500 XP Global', 500, 'XP_BOOST', 500, 'RARE', 'xp.webp'],
        ['tokens', 'Sac de Jetons', '10 Jetons Roue', 1000, 'TOKEN_PACK', 10, 'UNCOMMON', 'jetons.webp'],
        ['masterball', 'Master Ball', 'Capture 100%', 2500, 'CAPTURE', 100, 'LEGENDARY', 'pokeball.webp']
    ];

    $stmtItem = $pdo->prepare("INSERT INTO items (id, name, description, price, effect_type, value, rarity, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");

    foreach ($catalogItems as $item) {
        $stmtItem->execute($item);
    }
    echo "✅ " . count($catalogItems) . " objets insérés avec leurs images.<br>";


    // ==========================================
    // 2. INSERTION DES QUESTIONS (SEED)
    // ==========================================

    echo "<h2>📚 Banque de Questions</h2>";

    $questions = [
        // MATHS CP/CE1
        ['MATHS', 'CE1', 'EASY', 'Addition', 'Combien font 15 + 5 ?', ['18', '20', '25', '10'], 1, '15 plus 5 égale 20.'],
        ['MATHS', 'CE1', 'MEDIUM', 'Soustraction', 'Combien font 30 - 10 ?', ['20', '10', '15', '25'], 0, '30 moins 10 égale 20.'],
        ['MATHS', 'CE1', 'EASY', 'Géométrie', 'Combien de côtés a un triangle ?', ['3', '4', '2', '5'], 0, 'Un triangle a 3 côtés (tri-angle).'],
        ['MATHS', 'CE1', 'HARD', 'Multiplication', 'Combien font 2 x 5 ?', ['12', '7', '10', '25'], 2, '2 fois 5, c\'est 5 + 5 = 10.'],
        
        // FRANCAIS CE1/CE2
        ['FRANCAIS', 'CE1', 'EASY', 'Grammaire', 'Trouve le verbe : "Le chien court".', ['Le', 'chien', 'court', 'aucun'], 2, 'C\'est l\'action de courir.'],
        ['FRANCAIS', 'CE1', 'MEDIUM', 'Pluriel', 'Quel est le pluriel de "cheval" ?', ['chevals', 'chevaux', 'chevaus', 'chevales'], 1, 'Les mots en -al font souvent leur pluriel en -aux.'],
        ['FRANCAIS', 'CE2', 'MEDIUM', 'Conjugaison', 'Futur de "Je chante" ?', ['Je chantais', 'Je chanterai', 'J\'ai chanté', 'Je chante'], 1, 'Le futur exprime ce qui va se passer : Je chanterai demain.'],

        // MATHS CM1/CM2
        ['MATHS', 'CM1', 'MEDIUM', 'Multiplication', 'Combien font 6 x 7 ?', ['42', '36', '48', '54'], 0, '6 fois 7 égale 42.'],
        ['MATHS', 'CM2', 'HARD', 'Division', 'Quel est la moitié de 150 ?', ['60', '70', '75', '80'], 2, '75 + 75 = 150.'],
        
        // CULTURE G
        ['HISTOIRE', 'CM1', 'MEDIUM', 'Rois', 'Qui était Louis XIV ?', ['Le Roi Soleil', 'Le Roi Lune', 'Un Président', 'Un Chevalier'], 0, 'Louis XIV est surnommé le Roi Soleil.'],
        ['GEO', 'CM2', 'EASY', 'Capitales', 'Quelle est la capitale de la France ?', ['Lyon', 'Marseille', 'Paris', 'Bordeaux'], 2, 'C\'est Paris.'],
        ['ANGLAIS', '6EME', 'EASY', 'Vocabulaire', 'Que veut dire "Blue" ?', ['Rouge', 'Vert', 'Bleu', 'Jaune'], 2, 'Blue signifie Bleu.'],
        ['SVT', '5EME', 'MEDIUM', 'Corps humain', 'Combien d\'os a le corps humain adulte ?', ['100', '206', '350', '500'], 1, 'Un adulte a 206 os.']
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
    echo "✅ " . $countQ . " nouvelles questions ajoutées (doublons ignorés).<br>";

    echo "<hr><h3>🎉 Tout est configuré !</h3>";
    echo "<a href='/'>Retour au jeu</a>";

} catch (PDOException $e) {
    echo "❌ Erreur Critique : " . $e->getMessage();
}
?>