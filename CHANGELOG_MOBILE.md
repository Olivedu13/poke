# 📝 CHANGELOG - POKE-EDU

## [3.0.0] - 2026-02-04 - REFONTE MOBILE-FIRST COMPLÈTE

### 🎨 Frontend - Mobile-First Redesign

#### Nouveautés Majeures
- **Design System Mobile-First** avec Tailwind CSS
- **Navigation Bottom Bar** avec safe-area-inset support
- **Composants Touch-Optimized** (min 44px buttons)
- **Animations Fluides** avec Framer Motion
- **Modales Plein Écran** sur mobile

#### Composants Refactorisés

##### Battle Components
- ✅ `BattleScene.tsx` - Combat PvE mobile-optimized
  - HP bars compacts et lisibles
  - Action buttons 44px minimum
  - Team Manager modal plein écran mobile
  - Preview screen responsive
  
- ✅ `PvPLobby.tsx` - Lobby multijoueur refait
  - Socket.io service intégré
  - Cards joueurs responsive 2/4 colonnes
  - Challenge management tactile
  
- ✅ `PvPBattleProc.tsx` - Combat PvP temps réel
  - Interface mobile compacte
  - Panneau historique slide-in
  - Question display optimisé tactile

##### Metagame Components
- ✅ `Collection.tsx` - Gestion Pokémon
  - Grille responsive 2-4-5 colonnes
  - Modal détails plein écran mobile
  - Évolution overlay animée
  
- ✅ `Shop.tsx` - Marketplace
  - Tabs OBJETS/POKÉMON mobile-friendly
  - Grilles responsive 2-3-4 colonnes
  - Filtres dropdown mobile
  
- ✅ `Wheel.tsx` - Roue mystère
  - Taille adaptative (70vw mobile)
  - Buttons de mise responsive
  - Modal résultat plein écran

##### Dashboard Components
- ✅ `ParentDashboard.tsx` - Contrôle parental
  - Grille matières 1-2-3 colonnes
  - Sélecteurs niveau responsive
  - Toggle sujet libre mobile
  
- ✅ `SettingsPanel.tsx` - Paramètres
  - Modal plein écran mobile
  - Tabs CONFIG/COMPTE
  - Formulaires optimisés tactile

##### Auth Component
- ✅ `AuthForm.tsx` - Login/Register
  - Tabs Login/Register
  - Card design centré
  - Inputs grande taille mobile

#### Services Refactorisés

- ✅ `services/api.ts` - Axios + JWT
  - Endpoints Node.js `/api/*`
  - Intercepteurs auto JWT
  - Timeout 15s
  
- ✅ `services/socket.ts` - Socket.io client
  - Singleton pattern
  - Auto-reconnexion
  - Listeners persistants

#### Store Refactorisé

- ✅ `store/gameStore.ts` - Zustand
  - Endpoints Node.js mis à jour
  - `/collection` → `/api/collection`
  - `/shop.php` → `/api/shop/*`
  - `/auth.php` → `/api/auth/*`
  - `/update_config.php` → `/api/user/config`
  - `toggle_team` → `/api/collection/toggle-team`

#### Styles

- ✅ `src/styles/globals.css` - Design system
  - CSS variables (colors, spacing)
  - Utility classes (.card, .btn, etc.)
  - Animations (fadeIn, slideUp, shake)
  - Mobile touch improvements

- ✅ `index.html` - Meta mobile
  - viewport-fit=cover
  - theme-color mobile
  - PWA meta tags
  - Tailwind config inline

### 🚀 Infrastructure

#### Script de Déploiement VPS
- ✅ `deploy_vps.sh` - Déploiement automatique
  - Build frontend (Vite)
  - Sync rsync vers VPS
  - Install backend Node.js
  - Configure PM2 (API + Socket)
  - Configure Nginx
  - Setup SSL Let's Encrypt
  - Vérification PostgreSQL

#### Documentation
- ✅ `DEPLOY_MOBILE_FIRST.md` - Guide complet
  - Architecture frontend
  - Endpoints backend
  - Commandes VPS
  - Debug tips
  - Checklist post-déploiement

### 🔧 Changements Techniques

#### Breaking Changes
- ⚠️ Endpoints PHP supprimés → Node.js REST API
- ⚠️ `user_id` params supprimés (JWT auto)
- ⚠️ Response format standardisé `{ success, data, message }`

#### Améliorations
- ✨ JWT auto dans headers via intercepteur
- ✨ Socket.io avec reconnexion auto
- ✨ Safe-area-inset pour iPhone notch
- ✨ Touch targets 44px minimum
- ✨ Swipe gestures avec Framer Motion
- ✨ Lazy loading images
- ✨ Code splitting automatique (Vite)

### 📱 Responsive Design

#### Breakpoints
- **Mobile**: < 768px (défaut, prioritaire)
- **Tablet**: md: >= 768px
- **Desktop**: lg: >= 1024px
- **Large**: xl: >= 1280px

#### Grilles Adaptatives
- Collection: 2 → 4 → 5 colonnes
- Shop: 2 → 3 → 4 colonnes
- Matières: 1 → 2 → 3 colonnes
- Battle team: 1 → 3 colonnes

### 🐛 Corrections

- 🔧 Collection: Noms Pokémon corrigés (Tyradex API)
- 🔧 Shop: Gestion stock items
- 🔧 PvP: Notifications challenges
- 🔧 Auth: Validation email/password
- 🔧 Battle: Combo/Special gauge reset
- 🔧 Wheel: Confetti animation

### 🚀 Performance

- ⚡ Gzip compression (Nginx)
- ⚡ Assets cached 30 days
- ⚡ Code splitting React
- ⚡ Lazy loading routes
- ⚡ Image optimization (WebP)

### 🔐 Sécurité

- 🔒 JWT token localStorage
- 🔒 Auto-refresh token
- 🔒 CORS configured
- 🔒 Helmet.js headers
- 🔒 PostgreSQL user dédié
- 🔒 SSL Let's Encrypt

---

## [2.0.0] - 2026-02-04 - MIGRATION NODE.JS + POSTGRESQL

### Backend
- ✅ Migration PHP → Node.js/Express
- ✅ Migration MySQL → PostgreSQL 16
- ✅ Socket.io pour PvP temps réel
- ✅ JWT authentication
- ✅ Services modulaires
- ✅ Routes RESTful

### Database
- ✅ PostgreSQL schema
- ✅ Indexes optimisés
- ✅ Foreign keys
- ✅ Transactions

---

## [1.0.0] - 2026-01-15 - VERSION INITIALE PHP

### Features
- Authentification JWT (PHP)
- Collection Pokémon
- Système de combat PvE
- Shop (items + Pokémon)
- Roue mystère
- Dashboard parental
- MySQL database

---

**Dernière mise à jour**: 4 février 2026  
**Prochaine version**: 3.1.0 (PWA + Offline mode)
