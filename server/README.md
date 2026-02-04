# 🎮 Poke-Edu Backend Node.js

Backend moderne pour Poke-Edu : jeu éducatif avec combats Pokémon et quiz.

## 📋 Prérequis

- Node.js 20+
- PostgreSQL 16+
- Tunnel SSH actif vers le VPS (port 15432)

## 🚀 Installation Rapide

```bash
cd server
npm install
npx prisma generate
npm run build
npm start
```

## ⚙️ Configuration

Créer `.env` :
```env
DATABASE_URL="postgresql://pokeedu:rzoP3HCG@localhost:15432/poke_edu"
JWT_SECRET="votre_secret_jwt"
PORT=3000
SOCKET_PORT=3001
ALLOWED_ORIGINS="http://localhost:5173,https://votre-domaine.com"
```

## 📁 API Endpoints

### Auth
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion

### Collection
- `GET /api/collection` - Tous les Pokémon
- `GET /api/collection/team` - Équipe active
- `POST /api/collection/toggle-team` - Modifier l'équipe

### Shop
- `GET /api/shop/items` - Items en vente
- `POST /api/shop/buy` - Acheter

### Combat PvE
- `POST /api/battle/start` - Démarrer
- `POST /api/battle/answer` - Répondre
- `POST /api/battle/use-item` - Utiliser item

### PvP
- `GET /api/pvp/lobby/players` - Joueurs en ligne
- `POST /api/pvp/challenge/send` - Défier
- `POST /api/pvp/battle/answer` - Répondre

### Roue
- `POST /api/wheel/spin` - Tourner

## 🔌 WebSocket (PvP temps réel)

Port: 3001

Events: `pvp:join_lobby`, `pvp:send_challenge`, `pvp:submit_answer`...

## 📊 Migration PvP

```bash
# Appliquer les tables PvP
psql -U pokeedu -d poke_edu -f prisma/migrations/add_pvp_tables.sql
```

## 🛠 Scripts

```bash
npm run dev      # Développement
npm run build    # Build
npm start        # Production
npm test         # Tests
```
