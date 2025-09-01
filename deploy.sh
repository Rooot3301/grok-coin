#!/bin/bash

echo "🚀 Déploiement GrokCoin Bot en production"

# Vérifier que .env existe
if [ ! -f .env ]; then
    echo "❌ Fichier .env manquant !"
    echo "Créez le fichier .env avec vos tokens Discord"
    exit 1
fi

# Vérifier les variables d'environnement
source .env
if [ "$DISCORD_TOKEN" = "your_discord_bot_token_here" ] || [ -z "$DISCORD_TOKEN" ]; then
    echo "❌ DISCORD_TOKEN non configuré dans .env"
    exit 1
fi

if [ "$CLIENT_ID" = "your_discord_application_id_here" ] || [ -z "$CLIENT_ID" ]; then
    echo "❌ CLIENT_ID non configuré dans .env"
    exit 1
fi

echo "✅ Configuration validée"

# Installer les dépendances
echo "📦 Installation des dépendances..."
npm ci --only=production

# Rebuild better-sqlite3
echo "🔧 Rebuild better-sqlite3..."
npm rebuild better-sqlite3

# Enregistrer les commandes
echo "📝 Enregistrement des commandes Discord..."
npm run register:commands

# Créer les dossiers nécessaires
mkdir -p logs
mkdir -p backups

# Sauvegarde de la DB si elle existe
if [ -f grokcoin.db ]; then
    echo "💾 Sauvegarde de la base de données..."
    cp grokcoin.db "backups/grokcoin_$(date +%Y%m%d_%H%M%S).db"
fi

echo "🎉 Déploiement terminé !"
echo ""
echo "🚀 Pour démarrer le bot :"
echo "   npm start"
echo ""
echo "🐳 Ou avec Docker :"
echo "   docker-compose up -d"
echo ""
echo "📊 Ou avec PM2 :"
echo "   pm2 start ecosystem.config.js"