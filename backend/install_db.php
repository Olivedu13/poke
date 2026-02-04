
<?php
// backend/install_db.php
require_once 'db_connect.php';

echo "<h1>Installation / Mise à jour de la Base de Données</h1>";

try {
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // 1. Table INVENTORY
    $sqlInv = "CREATE TABLE IF NOT EXISTS `inventory` (
      `user_id` INT(11) NOT NULL,
      `item_id` VARCHAR(50) NOT NULL,
      `quantity` INT(11) NOT NULL DEFAULT 0,
      PRIMARY KEY (`user_id`, `item_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
    $pdo->exec($sqlInv);
    echo "✅ Table 'inventory' vérifiée.<br>";

    // 2. Table USER_POKEMON
    $sqlPoke = "CREATE TABLE IF NOT EXISTS `user_pokemon` (
      `id` CHAR(36) NOT NULL,
      `user_id` INT(11) NOT NULL,
      `tyradex_id` INT(11) NOT NULL,
      `nickname` VARCHAR(50) DEFAULT NULL,
      `level` INT(11) NOT NULL DEFAULT 1,
      `current_hp` INT(11) NOT NULL DEFAULT 20,
      `current_xp` INT(11) NOT NULL DEFAULT 0,
      `is_team` TINYINT(1) DEFAULT 0,
      `obtained_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
    $pdo->exec($sqlPoke);
    echo "✅ Table 'user_pokemon' vérifiée.<br>";

    // 3. Table ACTIVE_BATTLES (limite de combats simultanés)
    $sqlActiveBattles = "CREATE TABLE IF NOT EXISTS `active_battles` (
      `user_id` INT(11) NOT NULL PRIMARY KEY,
      `battle_type` ENUM('WILD', 'TRAINER', 'PVP') DEFAULT 'WILD',
      `started_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      KEY `idx_started` (`started_at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
    $pdo->exec($sqlActiveBattles);
    echo "✅ Table 'active_battles' vérifiée.<br>";

    // 3.1 Table PVP_MATCHES (combats PvP en cours)
    $sqlPvpMatches = "CREATE TABLE IF NOT EXISTS `pvp_matches` (
      `id` VARCHAR(36) NOT NULL PRIMARY KEY,
      `player1_id` INT(11) NOT NULL,
      `player2_id` INT(11) NOT NULL,
      `player1_team` JSON NOT NULL,
      `player2_team` JSON NOT NULL,
      `current_turn` INT(11) DEFAULT 1,
      `battle_state` JSON DEFAULT NULL,
      `status` ENUM('WAITING', 'ACTIVE', 'FINISHED') DEFAULT 'ACTIVE',
      `winner_id` INT(11) DEFAULT NULL,
      `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY `idx_players` (`player1_id`, `player2_id`),
      KEY `idx_status` (`status`, `updated_at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
    $pdo->exec($sqlPvpMatches);
    echo "✅ Table 'pvp_matches' vérifiée.<br>";

    // 3.2 Table PVP_ACTIONS (actions des joueurs dans les combats PvP)
    $sqlPvpActions = "CREATE TABLE IF NOT EXISTS `pvp_actions` (
      `id` INT(11) AUTO_INCREMENT PRIMARY KEY,
      `match_id` VARCHAR(36) NOT NULL,
      `player_id` INT(11) NOT NULL,
      `action_type` ENUM('ATTACK', 'ITEM', 'SWITCH', 'SURRENDER') NOT NULL,
      `action_data` JSON NOT NULL,
      `turn_number` INT(11) NOT NULL,
      `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      KEY `idx_match_turn` (`match_id`, `turn_number`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
    $pdo->exec($sqlPvpActions);
    echo "✅ Table 'pvp_actions' vérifiée.<br>";

    // 3.3 Table PVP_QUEUE (file d'attente matchmaking)
    $sqlPvpQueue = "CREATE TABLE IF NOT EXISTS `pvp_queue` (
      `user_id` INT(11) NOT NULL PRIMARY KEY,
      `grade_level` VARCHAR(10) NOT NULL,
      `team_json` JSON NOT NULL,
      `queued_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      KEY `idx_grade` (`grade_level`, `queued_at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
    $pdo->exec($sqlPvpQueue);
    echo "✅ Table 'pvp_queue' vérifiée.<br>";

    // 3.4 Table ONLINE_PLAYERS (joueurs en ligne pour le lobby PvP)
    $sqlOnlinePlayers = "CREATE TABLE IF NOT EXISTS `online_players` (
      `user_id` INT(11) NOT NULL PRIMARY KEY,
      `status` ENUM('available', 'in_battle', 'challenged') DEFAULT 'available',
      `last_seen` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY `idx_last_seen` (`last_seen`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
    $pdo->exec($sqlOnlinePlayers);
    echo "✅ Table 'online_players' vérifiée.<br>";

    // 3.5 Table PVP_CHALLENGES (défis entre joueurs)
    $sqlPvpChallenges = "CREATE TABLE IF NOT EXISTS `pvp_challenges` (
      `id` INT(11) AUTO_INCREMENT PRIMARY KEY,
      `challenger_id` INT(11) NOT NULL,
      `challenged_id` INT(11) NOT NULL,
      `status` ENUM('pending', 'accepted', 'declined', 'expired') DEFAULT 'pending',
      `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      KEY `idx_challenged` (`challenged_id`, `status`),
      KEY `idx_challenger` (`challenger_id`, `status`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
    $pdo->exec($sqlPvpChallenges);
    echo "✅ Table 'pvp_challenges' vérifiée.<br>";

    // 4. Table ITEMS (Catalogue)
    $sqlItems = "CREATE TABLE IF NOT EXISTS `items` (
      `id` VARCHAR(50) NOT NULL PRIMARY KEY,
      `name` VARCHAR(100) NOT NULL,
      `description` TEXT,
      `price` INT(11) NOT NULL DEFAULT 0,
      `effect_type` VARCHAR(50) NOT NULL,
      `value` INT(11) DEFAULT 0,
      `rarity` ENUM('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY') DEFAULT 'COMMON',
      `image` VARCHAR(100) DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
    $pdo->exec($sqlItems);
    echo "✅ Table 'items' vérifiée.<br>";
    
    // Insertion des items de base
    $baseItems = [
        ['heal_r1', 'Potion Basique', '+20 PV', 50, 'HEAL', 20, 'COMMON', 'soin.webp'],
        ['heal_r2', 'Super Potion', '+50 PV', 150, 'HEAL', 50, 'UNCOMMON', 'soin.webp'],
        ['heal_r3', 'Hyper Potion', '+100 PV', 300, 'HEAL', 100, 'RARE', 'soin.webp'],
        ['heal_r5', 'Potion Max', '+200 PV', 500, 'HEAL', 200, 'EPIC', 'soin.webp'],
        ['traitor_r1', 'Potion Traître', 'Empoisonne l\'adversaire (-30 PV)', 300, 'TRAITOR', 30, 'RARE', 'traitre.webp'],
        ['atk_r1', 'Attaque +', '+10 ATK temporaire', 100, 'BUFF_ATK', 10, 'COMMON', 'attaque.webp'],
        ['atk_r3', 'Attaque ++', '+20 ATK temporaire', 250, 'BUFF_ATK', 20, 'RARE', 'attaque.webp'],
        ['def_r1', 'Défense +', '+10 DEF temporaire', 100, 'BUFF_DEF', 10, 'COMMON', 'defense.webp'],
        ['pokeball', 'Pokéball', 'Capture un Pokémon', 200, 'CAPTURE', 1, 'COMMON', 'pokeball.webp'],
        ['masterball', 'Master Ball', 'Capture garantie', 5000, 'CAPTURE', 100, 'LEGENDARY', 'pokeball.webp'],
        ['joker', 'Joker', 'Passe une question', 500, 'JOKER', 1, 'RARE', 'joker.webp'],
        ['xp_pack', 'Pack XP', '+500 XP Global', 1000, 'XP_BOOST', 500, 'RARE', 'xp.webp'],
        ['evolution', 'Pierre d\'Évolution', 'Fait évoluer un Pokémon', 2000, 'EVOLUTION', 1, 'RARE', 'evolution.webp'],
        ['evolution_ultime', 'Cristal Ultime', 'Évolution max + Niveau 100', 10000, 'EVOLUTION_MAX', 1, 'LEGENDARY', 'evolution_ultime.webp'],
        ['mirror_r5', 'Miroir Magique', 'Double les récompenses', 3000, 'MIRROR', 1, 'EPIC', 'miroir.webp'],
        ['team_r5', 'Élixir d\'Équipe', 'Soigne toute l\'équipe', 1500, 'TEAM_HEAL', 100, 'EPIC', 'soin.webp']
    ];
    
    $stmtItem = $pdo->prepare("INSERT INTO items (id, name, description, price, effect_type, value, rarity, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), price=VALUES(price), effect_type=VALUES(effect_type), value=VALUES(value), rarity=VALUES(rarity), image=VALUES(image)");
    $countItems = 0;
    foreach ($baseItems as $item) {
        $stmtItem->execute($item);
        $countItems++;
    }
    echo "✅ $countItems items de base ajoutés/mis à jour.<br>";

    // 5. Colonnes manquantes dans USERS
    $cols = $pdo->query("DESCRIBE users")->fetchAll(PDO::FETCH_COLUMN);
    
    if (!in_array('global_xp', $cols)) {
        $pdo->exec("ALTER TABLE users ADD COLUMN `global_xp` INT(11) DEFAULT 0");
        echo "✅ Colonne 'global_xp' ajoutée.<br>";
    }
    if (!in_array('gold', $cols)) {
        $pdo->exec("ALTER TABLE users ADD COLUMN `gold` INT(11) DEFAULT 100");
        echo "✅ Colonne 'gold' ajoutée.<br>";
    }
    // NEW COLUMN FOR CATEGORIES
    if (!in_array('focus_categories', $cols)) {
        $pdo->exec("ALTER TABLE users ADD COLUMN `focus_categories` JSON DEFAULT NULL COMMENT 'Map Subject -> Category'");
        echo "✅ Colonne 'focus_categories' ajoutée.<br>";
    }

    echo "<hr><h3>🎉 Installation terminée avec succès !</h3>";
    echo "<p>Vous pouvez retourner sur l'application.</p>";

} catch (PDOException $e) {
    echo "❌ Erreur SQL : " . $e->getMessage();
}
?>
