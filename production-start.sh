#!/bin/bash

echo "🚀 Démarrage GrokCoin Bot en production"
echo "======================================="

# Vérifier l'environnement
if [ ! -f .env ]; then
    echo "❌ Fichier .env manquant !"
    exit 1
fi

# Charger les variables
source .env

# Vérifier les tokens
if [ "$DISCORD_TOKEN" = "your_discord_bot_token_here" ] || [ -z "$DISCORD_TOKEN" ]; then
    echo "❌ DISCORD_TOKEN non configuré"
    exit 1
fi

# Créer les dossiers
mkdir -p logs backups tmp

# Sauvegarde automatique
if [ -f grokcoin.db ]; then
    echo "💾 Sauvegarde automatique..."
    cp grokcoin.db "backups/auto_backup_$(date +%Y%m%d_%H%M%S).db"
fi

# Démarrer avec PM2
echo "⚡ Démarrage avec PM2..."
pm2 start ecosystem.config.cjs

echo ""
echo "✅ Bot démarré en production !"
echo ""
echo "📊 Commandes utiles :"
echo "   pm2 status           # Voir le statut"
echo "   pm2 logs grokcoin-bot # Voir les logs"
echo "   pm2 monit            # Monitoring"
echo "   pm2 restart grokcoin-bot # Redémarrer"
echo "   pm2 stop grokcoin-bot    # Arrêter"
echo ""