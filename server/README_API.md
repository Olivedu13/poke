# Poke-Edu Backend API & WebSocket

## REST API Example

### Get User Profile
- **GET** `/api/user/me`
- **Response:**
```json
{
  "user": {
    "id": 1,
    "username": "..."
  }
}
```

## WebSocket Example

### Get User Profile (Realtime)
- **Event:** `user:get_profile`
- **Payload:** `{}`
- **Response:**
```json
{
  "user": {
    "id": 1,
    "username": "..."
  }
}
```

## Conventions
- Toutes les routes REST sont sous `/api/`
- Les événements WebSocket sont documentés dans chaque handler
- Authentification par JWT (header ou handshake)

## Lancer en local
```bash
cd server
pnpm dev
```

## Tester
```bash
pnpm test
```

## Lint/Format
```bash
pnpm lint
pnpm format
```

## Contribution
- Respecter la convention de commit (commitlint)
- Lint/format auto (husky)
- Tests obligatoires pour toute PR
