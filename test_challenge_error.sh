#!/bin/bash
# Test rapide de l'erreur send_challenge

echo "Test de send_challenge avec un token de test..."
echo ""

# Note: Remplacez par un vrai token et ID
echo "Pour tester, connectez-vous d'abord et copiez votre token JWT"
echo ""
echo "Puis exécutez:"
echo 'curl -X POST "https://poke.sarlatc.com/backend/pvp_lobby.php" \'
echo '  -H "Authorization: Bearer VOTRE_TOKEN" \'
echo '  -H "Content-Type: application/json" \'
echo '  -d '"'"'{"action":"send_challenge","challenged_id":1}'"'"' | python3 -m json.tool'
