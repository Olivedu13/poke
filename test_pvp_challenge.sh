#!/bin/bash
# Test de l'envoi d'un défi PVP avec un vrai token JWT

# Récupérer un token de test (vous devez avoir un compte)
echo "Test de pvp_lobby.php avec action send_challenge"
echo ""

# Test sans token (devrait retourner 401)
echo "1. Test sans token:"
curl -s -X POST "https://poke.sarlatc.com/backend/pvp_lobby.php" \
  -H "Content-Type: application/json" \
  -d '{"action":"send_challenge","challenged_id":1}' | python3 -m json.tool

echo ""
echo "2. Test avec get_online_players:"
curl -s "https://poke.sarlatc.com/backend/pvp_lobby.php?action=get_online_players" | python3 -m json.tool
