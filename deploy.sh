#!/bin/bash

echo "🚀 Déploiement GrokCoin Bot en production..."
echo "================================================"

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

echo "✅ Variables d'environnement validées"

# Installer les dépendances
echo "📦 Installation des dépendances..."
npm ci --omit=dev --silent

# Enregistrer les commandes
echo "📝 Enregistrement des commandes Discord..."
npm run register:commands

# Créer les dossiers nécessaires
mkdir -p logs
mkdir -p backups
mkdir -p tmp

# Vérifier PM2
if command -v pm2 &> /dev/null; then
    echo "✅ PM2 détecté"
else
    echo "📦 Installation de PM2..."
    npm install -g pm2
fi

# Sauvegarde de la DB si elle existe
if [ -f grokcoin.db ]; then
    echo "💾 Sauvegarde automatique de la base de données..."
    cp grokcoin.db "backups/grokcoin_backup_$(date +%Y%m%d_%H%M%S).db"
    echo "✅ Sauvegarde créée dans backups/"
fi

echo ""
echo "🎉 Déploiement terminé avec succès !"
echo "================================================"
echo ""
echo "🚀 COMMANDES DE DÉMARRAGE :"
echo ""
echo "📋 Mode développement :"
echo "   npm run dev          # Avec auto-reload"
echo ""
echo "🚀 Mode production :"
echo "   npm start            # Démarrage simple"
echo ""
echo "⚡ Avec PM2 (recommandé) :"
echo "   npm run pm2:start    # Démarrer avec PM2"
echo "   npm run pm2:stop     # Arrêter"
echo "   npm run pm2:restart  # Redémarrer"
echo "   npm run pm2:logs     # Voir les logs"
echo "   pm2 monit            # Monitoring en temps réel"
echo ""
echo "🐳 Avec Docker :"
echo "   docker-compose up -d"
echo ""
echo "📊 Monitoring :"
echo "   pm2 status           # Statut des processus"
echo "   pm2 show grokcoin-bot # Détails du processus"
echo "   tail -f logs/*.log   # Logs en temps réel"