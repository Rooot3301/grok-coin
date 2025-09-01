import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { formatGrokCoin, COLORS } from '../utils/symbols.js';

export const data = new SlashCommandBuilder()
  .setName('test')
  .setDescription('🧪 Tester les fonctionnalités du bot');

export async function execute(interaction, db, config) {
  const uid = interaction.user.id;
  
  try {
    // Test de la base de données
    const user = db.getUser(uid);
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const totalCirculation = db.getTotalCirculation();
    
    // Test des propriétés
    const properties = db.getAllProperties();
    const userProperties = db.getUserProperties(uid);
    
    // Test du logement
    const housing = db.getUserHousing(uid);
    const rentStatus = db.checkRentDue(uid);
    
    const embed = new EmbedBuilder()
      .setTitle('🧪 Test du Bot - Résultats')
      .setColor(COLORS.SUCCESS)
      .setDescription('**Tous les systèmes sont opérationnels !**')
      .addFields(
        { 
          name: '✅ Base de Données', 
          value: `Utilisateurs: ${totalUsers}\nCirculation: ${formatGrokCoin(totalCirculation)}\nVotre solde: ${formatGrokCoin(user.balance)}`, 
          inline: true 
        },
        { 
          name: '✅ Immobilier', 
          value: `Propriétés disponibles: ${properties.length}\nVos biens: ${userProperties.length}\nLogement: ${housing ? housing.name : 'Aucun'}`, 
          inline: true 
        },
        { 
          name: '✅ Système de Loyer', 
          value: `Statut: ${rentStatus.due ? '❌ En retard' : '✅ À jour'}\nRetard: ${rentStatus.daysLate || 0} jour(s)`, 
          inline: true 
        },
        {
          name: '🎯 Métier',
          value: user.job ? `${config.economy.jobs[user.job].emoji} ${user.job}` : 'Aucun métier',
          inline: true
        },
        {
          name: '🏦 Banque',
          value: `Épargne: ${formatGrokCoin(user.bank_balance)}\nDernier intérêt: ${user.last_interest ? 'Réclamé' : 'Jamais'}`,
          inline: true
        },
        {
          name: '🎰 Casino',
          value: `Pertes quotidiennes: ${formatGrokCoin(user.daily_loss || 0)}\nVIP: ${user.vip_tier || 'Standard'}`,
          inline: true
        }
      )
      .setFooter({ text: '🧪 Test effectué avec succès' })
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Erreur lors du test:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Test du Bot - Erreur')
      .setColor(COLORS.ERROR)
      .setDescription(`**Erreur détectée :**\n\`\`\`${error.message}\`\`\``)
      .setFooter({ text: '🧪 Test échoué' })
      .setTimestamp();
    
    await interaction.reply({ embeds: [errorEmbed] });
  }
}