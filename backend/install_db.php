
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

    // 3. Colonnes manquantes dans USERS
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
