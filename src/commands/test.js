import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { formatCents } from '../utils/money.js';

export const data = new SlashCommandBuilder()
  .setName('test')
  .setDescription('🧪 Tester le fonctionnement du bot');

export async function execute(interaction, db, config) {
  const uid = interaction.user.id;
  
  try {
    // Test de base
    const user = await db.getUser(uid);
    const totalUsersResult = await db.execute('SELECT COUNT(*) as count FROM users');
    const totalUsers = totalUsersResult.rows[0].count;
    const totalCirculation = await db.getTotalCirculation();
    
    // Test des propriétés
    const properties = await db.getAllProperties();
    const userProperties = await db.getUserProperties(uid);
    
    // Test du logement
    const housing = await db.getUserHousing(uid);
    const rentStatus = await db.checkRentDue(uid);
    
    const embed = new EmbedBuilder()
      .setTitle('🧪 Test du Bot - Résultats')
      .setColor(0x4caf50)
      .setDescription('**Tous les systèmes sont opérationnels !**')
      .addFields(
        { 
          name: '✅ Base de Données', 
          value: `Utilisateurs: ${totalUsers}\nCirculation: ${formatCents(totalCirculation)} Ǥ\nVotre solde: ${formatCents(user.balance)} Ǥ`, 
          inline: true 
        },
        { 
          name: '✅ Immobilier', 
          value: `Propriétés: ${properties.length}\nVos biens: ${userProperties.length}\nLogement: ${housing ? housing.name : 'Aucun'}`, 
          inline: true 
        },
        { 
          name: '✅ Système de Loyer', 
          value: `Statut: ${rentStatus.due ? '❌ En retard' : '✅ À jour'}\nRetard: ${rentStatus.daysLate || 0} jour(s)`, 
          inline: true 
        },
        {
          name: '🎯 Métier',
          value: user.job ? `${config.economy.jobs[user.job]?.emoji || '💼'} ${user.job}` : 'Aucun métier',
          inline: true
        },
        {
          name: '🏦 Banque',
          value: `Épargne: ${formatCents(user.bank_balance)} Ǥ\nIntérêts: ${user.last_interest ? 'Réclamés' : 'Jamais'}`,
          inline: true
        },
        {
          name: '🎰 Casino',
          value: `VIP: ${user.vip_tier || 'Standard'}\nTotal misé: ${formatCents(user.total_wagered || 0)} Ǥ`,
          inline: true
        }
      )
      .setFooter({ text: '🧪 Test effectué avec succès' })
      .setTimestamp();
    
    return interaction.reply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Erreur lors du test:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Test du Bot - Erreur')
      .setColor(0xf44336)
      .setDescription(`**Erreur détectée :**\n\`\`\`${error.message}\`\`\``)
      .setFooter({ text: '🧪 Test échoué' })
      .setTimestamp();
    
    return interaction.reply({ embeds: [errorEmbed] });
  }
}