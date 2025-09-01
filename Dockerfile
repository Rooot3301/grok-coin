FROM node:18-alpine

# Installer les dépendances système pour better-sqlite3
RUN apk add --no-cache python3 make g++ sqlite

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production

# Copier le code source
COPY . .

# Créer le dossier logs
RUN mkdir -p logs

# Exposer le port (optionnel pour un bot Discord)
EXPOSE 3000

# Commande de démarrage
CMD ["npm", "start"]