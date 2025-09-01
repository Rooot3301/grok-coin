#!/usr/bin/env node

/**
 * Script de test pour vérifier toutes les fonctionnalités du bot
 */

import Database from 'better-sqlite3';
import fs from 'fs';

console.log('🧪 Démarrage des tests GrokCoin Bot...\n');

// Test 1: Configuration
console.log('1️⃣ Test de la configuration...');
try {
  const configPath = new URL('./config.json', import.meta.url);
  const config = JSON.parse(fs.readFileSync(configPath));
  console.log('✅ Configuration chargée');
  console.log(`   - ${Object.keys(config.economy.jobs).length} métiers disponibles`);
  console.log(`   - ${config.immo.properties.length} propriétés immobilières`);
} catch (error) {
  console.log('❌ Erreur de configuration:', error.message);
  process.exit(1);
}

// Test 2: Base de données
console.log('\n2️⃣ Test de la base de données...');
try {
  const db = new Database('./grokcoin.db');
  
  // Test des tables principales
  const tables = ['users', 'properties', 'guilds', 'guild_members', 'loans'];
  for (const table of tables) {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get().count;
    console.log(`✅ Table ${table}: ${count} entrées`);
  }
  
  db.close();
} catch (error) {
  console.log('❌ Erreur de base de données:', error.message);
  process.exit(1);
}

// Test 3: Variables d'environnement
console.log('\n3️⃣ Test des variables d\'environnement...');
try {
  if (fs.existsSync('.env')) {
    const envContent = fs.readFileSync('.env', 'utf8');
    const hasToken = envContent.includes('DISCORD_TOKEN=');
    const hasClientId = envContent.includes('CLIENT_ID=');
    
    if (hasToken && hasClientId) {
      console.log('✅ Fichier .env configuré');
    } else {
      console.log('⚠️ Fichier .env incomplet (tokens manquants)');
    }
  } else {
    console.log('❌ Fichier .env manquant');
  }
} catch (error) {
  console.log('❌ Erreur .env:', error.message);
}

// Test 4: Modules et dépendances
console.log('\n4️⃣ Test des dépendances...');
try {
  await import('discord.js');
  console.log('✅ discord.js importé');
  
  await import('better-sqlite3');
  console.log('✅ better-sqlite3 importé');
  
  await import('dotenv');
  console.log('✅ dotenv importé');
} catch (error) {
  console.log('❌ Erreur de dépendance:', error.message);
  console.log('💡 Exécutez: npm install');
}

// Test 5: Structure des fichiers
console.log('\n5️⃣ Test de la structure des fichiers...');
const requiredFiles = [
  'src/index.js',
  'src/db.js',
  'src/config.json',
  'src/commands/start.js',
  'src/commands/profil.js',
  'src/commands/dashboard.js',
  'src/commands/menu.js',
  'src/commands/guild.js',
  'src/utils/symbols.js'
];

for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} manquant`);
  }
}

console.log('\n🎉 Tests terminés !');
console.log('\n📋 Pour démarrer le bot:');
console.log('   1. Configurez vos tokens dans .env');
console.log('   2. npm run register:commands');
console.log('   3. npm start');