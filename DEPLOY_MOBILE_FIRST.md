# 🚀 DÉPLOIEMENT POKE-EDU - MOBILE FIRST

## 📱 Architecture Frontend Refactored

### Stack Mobile-First
- **React 18** + TypeScript
- **Tailwind CSS** (CDN) - Design system responsive
- **Framer Motion** - Animations fluides
- **Socket.io Client** - PvP temps réel
- **Zustand** - State management
- **Axios** - Requêtes HTTP avec intercepteurs JWT

### Composants Refactorisés

#### 🎮 Battle Components (Mobile-Optimized)
- `BattleScene.tsx` - Combat PvE mobile-first avec HP bars compacts
- `PvPLobby.tsx` - Lobby multijoueur avec Socket.io
- `PvPBattleProc.tsx` - Combat PvP temps réel avec panneau historique slide-in

#### 🎒 Metagame Components (Touch-Optimized)
- `Collection.tsx` - Gestion Pokémon avec modales plein écran mobile
- `Shop.tsx` - Marketplace responsive (2 colonnes mobile, 4 desktop)
- `Wheel.tsx` - Roue de la fortune optimisée tactile

#### ⚙️ Dashboard Components (Responsive)
- `ParentDashboard.tsx` - Contrôle parental adaptatif
- `SettingsPanel.tsx` - Paramètres en modal plein écran mobile

#### 🔐 Auth Component
- `AuthForm.tsx` - Login/Register avec tabs, design carte mobile

### Services
- `api.ts` - Instance Axios avec JWT auto, endpoints Node.js `/api/*`
- `socket.ts` - Service Socket.io singleton avec reconnexion

### Endpoints Backend (Node.js)

```
Auth:
  POST /api/auth/register
  POST /api/auth/login
  GET  /api/auth/verify

Battle:
  POST /api/battle/rewards

Collection:
  GET  /api/collection
  POST /api/collection/toggle-team

Shop:
  GET  /api/shop/items
  GET  /api/shop/pokemons
  POST /api/shop/buy-item
  POST /api/shop/buy-pokemon
  POST /api/shop/sell-item
  POST /api/shop/sell-pokemon

User:
  PUT  /api/user/config

PvP (Socket.io):
  wss://jeu.sarlatc.com
  Events: join_lobby, challenge, accept_challenge, decline_challenge, etc.
```

## 🔧 Déploiement VPS

### Prérequis
- VPS: `87.106.1.134`
- Domaine: `jeu.sarlatc.com` (DNS pointé vers le VPS)
- Accès SSH root
- PostgreSQL 16
- Node.js 20+

### Déploiement Automatique

```bash
# Depuis la racine du projet:
./deploy_vps.sh
```

Le script effectue automatiquement :
1. ✅ Build du frontend React (Vite)
2. ✅ Synchronisation rsync vers le VPS
3. ✅ Installation des dépendances Node.js
4. ✅ Configuration PM2 (API + Socket.io)
5. ✅ Configuration Nginx (reverse proxy)
6. ✅ Certificat SSL Let's Encrypt
7. ✅ Vérification PostgreSQL

### Déploiement Manuel

```bash
# 1. Build frontend
VITE_API_URL="https://jeu.sarlatc.com/api" \
VITE_SOCKET_URL="https://jeu.sarlatc.com" \
npm run build

# 2. Upload vers VPS
rsync -avz dist/ root@87.106.1.134:/var/www/poke-edu/frontend/
rsync -avz backend/ root@87.106.1.134:/var/www/poke-edu/backend/

# 3. Sur le VPS
ssh root@87.106.1.134
cd /var/www/poke-edu/backend
npm install
pm2 restart all
```

### Structure VPS

```
/var/www/poke-edu/
├── frontend/          # Build React (dist/)
│   ├── index.html
│   ├── assets/
│   └── ...
├── backend/           # Node.js + Socket.io
│   ├── src/
│   │   ├── server.js
│   │   ├── socket-server.js
│   │   └── ...
│   ├── package.json
│   └── .env
└── logs/             # Logs PM2
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name jeu.sarlatc.com;

    # Frontend (SPA React)
    root /var/www/poke-edu/frontend;
    index index.html;

    # API Backend
    location /api/ {
        proxy_pass http://localhost:3000/;
        # Headers pour JWT...
    }

    # WebSocket Socket.io
    location /socket.io/ {
        proxy_pass http://localhost:3001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # React Router (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 🎨 Design System Mobile-First

### Breakpoints Tailwind

```css
/* Mobile: < 768px (défaut) */
/* Tablet: md: >= 768px */
/* Desktop: lg: >= 1024px */
/* Large: xl: >= 1280px */
```

### Composants Touch-Optimized

- Buttons min 44px (Apple guidelines)
- Swipe gestures (Framer Motion)
- Bottom navigation (safe-area-inset)
- Modales plein écran mobile
- Cards 2 colonnes mobile, 4 desktop

### Animations

```css
/* globals.css */
@keyframes fadeIn { ... }
@keyframes slideUp { ... }
@keyframes shake { ... }
```

## 📊 State Management (Zustand)

```typescript
// gameStore.ts
useGameStore:
  - user: User
  - token: JWT
  - collection: Pokemon[]
  - inventory: Item[]
  - battlePhase: BattlePhase
  - pvpNotification: { challengeId, challengerName }
  
  // Actions
  - login(user, token)
  - fetchCollection()
  - fetchInventory()
  - setBattlePhase(phase)
  - setPvpNotification(notif)
```

## 🔌 Socket.io Client

```typescript
// services/socket.ts
socketService:
  - connect(token)
  - disconnect()
  - emit(event, data)
  - on(event, callback)
  - off(event, callback)
  
// Auto-reconnexion + listeners persistants
```

## 🚀 Commandes Utiles

```bash
# Développement local
npm run dev                      # Vite dev server

# Build production
npm run build                    # Build dans dist/

# Déploiement
./deploy_vps.sh                  # Deploy complet
rsync -avz dist/ root@87.106.1.134:/var/www/poke-edu/frontend/  # Frontend only

# VPS - PM2
ssh root@87.106.1.134
pm2 status                       # État des process
pm2 logs poke-api                # Logs API
pm2 logs poke-socket             # Logs Socket
pm2 restart all                  # Restart services
pm2 monit                        # Monitoring temps réel

# VPS - Nginx
nginx -t                         # Test config
systemctl reload nginx           # Reload config
tail -f /var/log/nginx/poke-edu-error.log  # Logs erreurs

# VPS - PostgreSQL
sudo -u postgres psql poke_edu   # Console DB
```

## 🐛 Debug

### Frontend ne charge pas
```bash
# Vérifier les chemins API dans config.ts
# Vérifier le build: ls -la dist/
# Vérifier Nginx: nginx -t && systemctl reload nginx
```

### API 502 Bad Gateway
```bash
# Vérifier que l'API tourne
ssh root@87.106.1.134 'pm2 status'
ssh root@87.106.1.134 'pm2 logs poke-api --lines 50'
```

### Socket.io ne connecte pas
```bash
# Vérifier Socket.io
ssh root@87.106.1.134 'pm2 logs poke-socket --lines 50'
# Vérifier que le port 3001 est ouvert
ssh root@87.106.1.134 'netstat -tlnp | grep 3001'
```

### Database connection failed
```bash
# Vérifier PostgreSQL
ssh root@87.106.1.134 'systemctl status postgresql'
# Vérifier credentials dans backend/.env
```

## ✅ Checklist Post-Déploiement

- [ ] Frontend accessible: https://jeu.sarlatc.com
- [ ] API répond: https://jeu.sarlatc.com/api/health
- [ ] Socket.io connecte (DevTools Network → WS)
- [ ] Login/Register fonctionnels
- [ ] Collection charge les Pokémon
- [ ] Shop affiche items et Pokémon
- [ ] Roue mystère fonctionne
- [ ] Combat PvE lance correctement
- [ ] Lobby PvP affiche les joueurs en ligne
- [ ] Combat PvP temps réel fonctionne
- [ ] Responsive mobile (< 768px)
- [ ] Certificat SSL valide (cadenas vert)

## 📱 Tests Mobile Recommandés

- iPhone SE (375px)
- iPhone 12/13 (390px)
- Samsung Galaxy S21 (360px)
- iPad (768px)
- Android tablet (800px)

## 🔐 Sécurité

- JWT stocké dans localStorage
- Token auto-refresh via intercepteur
- CORS configuré pour jeu.sarlatc.com
- Rate limiting sur API (à vérifier)
- Helmet.js pour headers sécurité
- PostgreSQL avec utilisateur dédié

## 📈 Performance

- Gzip compression (Nginx)
- Assets cachés 30j (Nginx)
- Code splitting React (Vite)
- Lazy loading images
- WebP images (à optimiser)

---

**Dernière mise à jour**: 4 février 2026  
**Version Frontend**: 3.0.0 (Mobile-First Refactor)  
**Version Backend**: 2.0.0 (Node.js + PostgreSQL)
