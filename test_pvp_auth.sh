#!/bin/bash
# Test complet de l'envoi de défi PVP avec authentification

echo "=== TEST PVP LOBBY AVEC AUTHENTIFICATION ==="
echo ""

# Demander les credentials
read -p "Username: " username
read -sp "Password: " password
echo ""

# 1. Se connecter pour obtenir un token
echo ""
echo "1. Connexion..."
response=$(curl -s -X POST "https://poke.sarlatc.com/backend/auth.php" \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"login\",\"username\":\"$username\",\"password\":\"$password\"}")

echo "$response" | python3 -m json.tool

# Extraire le token
token=$(echo "$response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('token', ''))" 2>/dev/null)

if [ -z "$token" ]; then
    echo "❌ Impossible de se connecter"
    exit 1
fi

echo ""
echo "✅ Token obtenu: ${token:0:50}..."
echo ""

# 2. Tester get_online_players
echo "2. Test get_online_players..."
curl -s "https://poke.sarlatc.com/backend/pvp_lobby.php?action=get_online_players" \
  -H "Authorization: Bearer $token" | python3 -m json.tool
echo ""

# 3. Tester send_challenge (besoin d'un ID cible)
echo ""
read -p "ID du joueur à défier (ou Enter pour skip): " target_id

if [ ! -z "$target_id" ]; then
    echo ""
    echo "3. Test send_challenge vers joueur $target_id..."
    curl -s -X POST "https://poke.sarlatc.com/backend/pvp_lobby.php" \
      -H "Authorization: Bearer $token" \
      -H "Content-Type: application/json" \
      -d "{\"action\":\"send_challenge\",\"challenged_id\":$target_id}" | python3 -m json.tool
fi
