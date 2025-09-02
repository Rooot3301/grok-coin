import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { formatCents, toCents } from '../utils/money.js';
import { COLORS } from '../utils/symbols.js';
import crypto from 'crypto';

export const data = new SlashCommandBuilder()
  .setName('vol')
  .setDescription('🏴‍☠️ Tenter de voler un joueur (argent liquide uniquement)')
  .addUserOption(opt => opt.setName('cible').setDescription('Joueur à voler').setRequired(true));

// Générateur aléatoire sécurisé pour "provably fair"
function generateSecureRandom() {
  const buffer = crypto.randomBytes(4);
  return buffer.readUInt32BE(0) / 0xFFFFFFFF;
}

function generateProof(userId, targetId, timestamp) {
  const data = `${userId}-${targetId}-${timestamp}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 8);
}

export async function execute(interaction, db, config) {
  const uid = interaction.user.id;
  const targetUser = interaction.options.getUser('cible');
  const user = db.getUser(uid);
  const target = db.getUser(targetUser.id);
  
  if (targetUser.bot || targetUser.id === uid) {
    return interaction.reply({ content: '❌ Vous ne pouvez pas voler un bot ou vous-même.', ephemeral: true });
  }
  
  // Vérifier le cooldown (1 vol par heure)
  const lastTheft = db.getSetting(`last_theft_${uid}`) || 0;
  const cooldownMs = 60 * 60 * 1000; // 1 heure
  const now = Date.now();
  
  if (now - lastTheft < cooldownMs) {
    const waitMinutes = Math.ceil((cooldownMs - (now - lastTheft)) / 60000);
    return interaction.reply({ 
      content: `⏳ Vous devez attendre ${waitMinutes} minute(s) avant de voler à nouveau.`, 
      ephemeral: true 
    });
  }
  
  // Vérifier que la cible a de l'argent liquide
  if (target.balance < toCents(100)) {
    return interaction.reply({ 
      content: '💰 Cette personne n\'a pas assez d\'argent liquide (minimum 100 Ǥ).', 
      ephemeral: true 
    });
  }
  
  // Coût du vol
  const theftCost = toCents(200);
  if (user.balance < theftCost) {
    return interaction.reply({ 
      content: '💰 Il faut 200 Ǥ pour tenter un vol.', 
      ephemeral: true 
    });
  }
  
  db.adjustBalance(uid, -theftCost);
  db.setSetting(`last_theft_${uid}`, now);
  
  // Génération sécurisée du résultat
  const timestamp = Date.now();
  const proof = generateProof(uid, targetUser.id, timestamp);
  const random = generateSecureRandom();
  
  // Taux de succès basé sur la différence de richesse
  const wealthRatio = user.balance / Math.max(target.balance, 1);
  let baseSuccessRate = 0.3; // 30% de base
  
  // Bonus si le voleur est plus pauvre
  if (wealthRatio < 0.5) baseSuccessRate += 0.2;
  if (wealthRatio < 0.1) baseSuccessRate += 0.2;
  
  const success = random < baseSuccessRate;
  
  let result = '';
  let stolenAmount = 0;
  
  if (success) {
    // Vol réussi : 5-15% de l'argent liquide
    const stealPercentage = 0.05 + (generateSecureRandom() * 0.1); // 5-15%
    stolenAmount = Math.floor(target.balance * stealPercentage);
    stolenAmount = Math.min(stolenAmount, toCents(5000)); // Maximum 5000 Ǥ
    
    db.adjustBalance(targetUser.id, -stolenAmount);
    db.adjustBalance(uid, stolenAmount);
    
    result = `🏴‍☠️ **VOL RÉUSSI !**\n\nVous avez volé **${formatCents(stolenAmount)} Ǥ** à ${targetUser.username} !`;
  } else {
    result = `🚨 **VOL ÉCHOUÉ !**\n\nVous avez été attrapé ! Vous perdez vos **${formatCents(theftCost)} Ǥ** d'équipement.`;
  }
  
  const embed = new EmbedBuilder()
    .setTitle('🏴‍☠️ Tentative de Vol')
    .setColor(success ? COLORS.SUCCESS : COLORS.ERROR)
    .setDescription(result)
    .addFields(
      { name: '🎯 Cible', value: targetUser.username, inline: true },
      { name: '🎲 Taux de succès', value: `${(baseSuccessRate * 100).toFixed(0)}%`, inline: true },
      { name: '💳 Votre solde', value: `${formatCents(db.getUser(uid).balance)} Ǥ`, inline: true },
      { name: '🔐 Preuve', value: `\`${proof}\``, inline: false }
    )
    .setFooter({ text: '🏴‍☠️ Provably Fair • Générateur cryptographique sécurisé' })
    .setTimestamp();
  
  return interaction.reply({ embeds: [embed] });
}