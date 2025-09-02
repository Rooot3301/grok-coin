#!/bin/bash

echo "⚡ Déploiement rapide GrokCoin Bot"
echo "================================="

# Arrêter PM2 si en cours
pm2 stop grokcoin-bot 2>/dev/null || true

# Mise à jour rapide
echo "📦 Mise à jour des dépendances..."
npm install --silent

# Enregistrer les commandes
echo "📝 Enregistrement des commandes..."
npm run register:commands

# Redémarrer
echo "🚀 Redémarrage..."
pm2 start ecosystem.config.js

echo "✅ Déploiement rapide terminé !"
pm2 status