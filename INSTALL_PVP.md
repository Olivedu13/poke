# Installation et Correction du Système PVP

## ❌ Problème Identifié
Le mode PVP ne fonctionnait pas car les tables nécessaires n'étaient pas créées dans la base de données. Quand vous vous connectiez avec 2 onglets différents, les joueurs ne se voyaient pas mutuellement.

## ✅ Solutions Apportées

### 1. Tables de Base de Données Ajoutées
Trois nouvelles tables ont été ajoutées :
- **`online_players`** : Gère la présence en ligne des joueurs (heartbeat toutes les 3 secondes)
- **`pvp_challenges`** : Enregistre les défis envoyés entre joueurs
- **`pvp_matches`** : Enregistre les matchs PVP en cours et terminés

### 2. Bouton Rafraîchir
Un nouveau bouton "🔄 RAFRAÎCHIR" a été ajouté dans le lobby PVP :
- Permet de rafraîchir manuellement la liste des joueurs
- Affiche une animation pendant le chargement
- Se désactive automatiquement pendant le chargement

### 3. Corrections de Code
- Correction du nom de colonne : `u.grade` → `u.grade_level`
- Correction du nom de table : `pokemon` → `user_pokemon`
- Amélioration de la gestion des erreurs dans le fetch

## 📦 Installation

### Méthode 1 : Installation Directe (Recommandée - Sans Login)

Accédez directement au script d'installation :
```
http://votre-domaine/backend/install_pvp_tables.php
```

Vous devriez voir :
```json
{
  "success": true,
  "message": "Tables PVP créées avec succès !",
  "tables": ["online_players", "pvp_challenges", "pvp_matches"]
}
```

**✅ Aucune authentification requise** - Fonctionne sans se connecter !

### Méthode 2 : Page d'Installation Guidée

Ouvrez cette page pour un guide visuel étape par étape :
```
http://votre-domaine/assets/install_pvp.html
```

Cette page :
- Détecte automatiquement votre domaine
- Génère les bonnes URLs
- Permet de copier les URLs en un clic
- Fonctionne sans authentification

### Méthode 3 : Interface de Test Complète

Si vous êtes déjà connecté, utilisez l'interface complète :
```
http://votre-domaine/assets/test_pvp.html
```

**Note :** Cette page nécessite d'être connecté à l'application.

### Méthode 4 : Installation Manuelle (SQL)

Si les méthodes automatiques ne fonctionnent pas, exécutez ce SQL dans phpMyAdmin :

```sql
-- Table online_players
CREATE TABLE IF NOT EXISTS `online_players` (
  `user_id` INT(11) NOT NULL,
  `status` ENUM('available', 'in_battle', 'challenged') DEFAULT 'available',
  `last_seen` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_online_player` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table pvp_challenges
CREATE TABLE IF NOT EXISTS `pvp_challenges` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `challenger_id` INT(11) NOT NULL,
  `challenged_id` INT(11) NOT NULL,
  `status` ENUM('pending', 'accepted', 'declined', 'expired') DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_challenger` (`challenger_id`),
  KEY `idx_challenged` (`challenged_id`),
  CONSTRAINT `fk_challenger` FOREIGN KEY (`challenger_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_challenged` FOREIGN KEY (`challenged_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table pvp_matches
CREATE TABLE IF NOT EXISTS `pvp_matches` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `player1_id` INT(11) NOT NULL,
  `player2_id` INT(11) NOT NULL,
  `status` ENUM('WAITING', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED') DEFAULT 'WAITING',
  `winner_id` INT(11) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `ended_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_player1` (`player1_id`),
  KEY `idx_player2` (`player2_id`),
  CONSTRAINT `fk_match_player1` FOREIGN KEY (`player1_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_match_player2` FOREIGN KEY (`player2_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_match_winner` FOREIGN KEY (`winner_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 🧪 Test du Mode PVP

### Test Simple
1. Ouvrez 2 onglets dans votre navigateur
2. Connectez-vous avec 2 comptes différents (créez-en si nécessaire)
3. Sur chaque compte, allez dans **Bataille → PVP**
4. Vous devriez voir l'autre joueur dans la liste
5. Testez le bouton "🔄 RAFRAÎCHIR"

### Test avec le Panneau de Debug
1. Ouvrez `http://votre-domaine/assets/test_pvp.html`
2. Utilisez les boutons pour :
   - Voir les joueurs en ligne
   - Voir les défis en cours
   - Voir les matches
   - Nettoyer les données obsolètes

## 🔍 Debugging

### Les joueurs ne se voient toujours pas ?

**1. Vérifiez que les tables existent**
Dans phpMyAdmin, exécutez :
```sql
SHOW TABLES LIKE 'online_players';
SHOW TABLES LIKE 'pvp_challenges';
SHOW TABLES LIKE 'pvp_matches';
```

**2. Vérifiez la console navigateur (F12)**
- Ouvrez les DevTools (F12)
- Allez dans l'onglet "Console"
- Recherchez des erreurs rouges
- Vérifiez que l'appel à `/pvp_lobby.php?action=get_online_players` retourne des données

**3. Testez l'API directement**
Dans la console du navigateur, après vous être connecté :
```javascript
// Récupérer le token
const token = localStorage.getItem('token');

// Tester l'API
fetch('/backend/pvp_lobby.php?action=get_online_players', {
    headers: {
        'Authorization': `Bearer ${token}`
    }
})
.then(r => r.json())
.then(console.log);
```

**4. Vérifiez que les joueurs sont bien insérés**
Dans phpMyAdmin :
```sql
SELECT * FROM online_players;
```
Vous devriez voir une ligne par joueur connecté au lobby.

**5. Vérifiez les timestamps**
```sql
SELECT 
    user_id, 
    status, 
    last_seen,
    TIMESTAMPDIFF(SECOND, last_seen, NOW()) as seconds_ago
FROM online_players;
```
Les joueurs avec `seconds_ago > 30` sont considérés comme déconnectés.

## 🏗️ Architecture du Système PVP

### Polling System
- Le frontend interroge le serveur **toutes les 3 secondes**
- Chaque appel met à jour le `last_seen` du joueur
- Les joueurs inactifs depuis **> 30 secondes** sont automatiquement retirés

### Flux de Défis
1. **Joueur A** clique sur "⚔️ DÉFIER" → crée une entrée dans `pvp_challenges`
2. **Joueur B** reçoit le défi (affiché en haut du lobby)
3. **Joueur B** accepte → crée une entrée dans `pvp_matches`
4. Les deux joueurs passent en mode combat

### Statuts des Joueurs
- `available` : Disponible pour être défié
- `in_battle` : En combat (ne peut pas être défié)
- `challenged` : A reçu un défi (non utilisé actuellement)

## 📝 Fichiers Modifiés

### Nouveaux Fichiers
- `/backend/install_pvp_tables.php` - Script d'installation des tables
- `/backend/test_pvp_status.php` - API de test/debug
- `/assets/test_pvp.html` - Interface de test
- `/INSTALL_PVP.md` - Ce fichier

### Fichiers Modifiés
- `/database.sql` - Ajout des 3 tables PVP
- `/backend/pvp_lobby.php` - Correction des noms de colonnes
- `/components/battle/PvPLobby.tsx` - Ajout du bouton rafraîchir

## ✨ Nouvelles Fonctionnalités

### Bouton Rafraîchir
```tsx
<button onClick={handleRefresh} disabled={loading}>
  <span className={loading ? 'animate-spin' : ''}>🔄</span>
  RAFRAÎCHIR
</button>
```
- Force une mise à jour immédiate
- Animation de rotation pendant le chargement
- Désactivé pendant le chargement

### Gestion des Erreurs Améliorée
- Réinitialise les erreurs lors d'un fetch réussi
- Affiche des messages d'erreur clairs
- Gère les cas de timeout et de déconnexion

## 🚀 Prochaines Étapes (Optionnel)

Pour améliorer encore le système :

1. **WebSockets** au lieu de polling
   - Plus réactif et temps réel
   - Réduit la charge serveur
   - Voir `ARCHITECTURE_PVP_LONGPOLLING.md` pour l'implémentation

2. **Notifications Push**
   - Notifier quand on reçoit un défi
   - Alertes sonores

3. **Historique des Matches**
   - Page dédiée aux statistiques
   - Taux de victoire, classement ELO

4. **Système de Matchmaking**
   - Appariement automatique par niveau
   - Files d'attente ranked/casual
