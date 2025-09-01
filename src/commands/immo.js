import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { formatCents, toCents } from '../utils/money.js';
import { COLORS } from '../utils/symbols.js';

export const data = new SlashCommandBuilder()
  .setName('immo')
  .setDescription('Gestion des biens immobiliers')
  .addSubcommand(sub => sub.setName('liste').setDescription('Afficher les biens disponibles'))
  .addSubcommand(sub => sub.setName('acheter').setDescription('Acheter un bien immobilier')
    .addStringOption(opt => opt.setName('bien').setDescription('ID du bien à acheter').setRequired(true)))
  .addSubcommand(sub => sub.setName('mes_biens').setDescription('Afficher vos biens'))
  .addSubcommand(sub => sub.setName('loyer').setDescription('Payer votre loyer'))
  .addSubcommand(sub => sub.setName('statut').setDescription('Vérifier le statut de votre logement'));
export async function execute(interaction, db, config) {
  const uid = interaction.user.id;
  const sub = interaction.options.getSubcommand();
  if (sub === 'liste') {
    const props = db.getAllProperties();
    const fields = props.filter(p => p.id !== 'cardboard_box').map(p => ({ 
      name: `${p.emoji} ${p.name} (ID: ${p.id})`, 
      value: `💰 Prix: ${formatCents(p.price * 100)} Ǥ\n🏠 Loyer/semaine: ${formatCents(p.rent * 100)} Ǥ`, 
      inline: true 
    }));
    const embed = new EmbedBuilder()
      .setTitle('🏠 Biens Immobiliers Disponibles')
      .setColor(COLORS.IMMO)
      .setDescription('**Investissez dans l\'immobilier de GrokCity !**\n*Tous les biens génèrent des revenus passifs*')
      .addFields(fields);
    await interaction.reply({ embeds: [embed] });
  } else if (sub === 'acheter') {
    const id = interaction.options.getString('bien');
    const all = db.getAllProperties();
    const prop = all.find(p => p.id === id);
    if (!prop) return interaction.reply({ content: 'Bien introuvable. Utilisez /immo liste pour voir les IDs.', ephermal: true });
    if (prop.id === 'cardboard_box') return interaction.reply({ content: 'Vous ne pouvez pas acheter ce logement de base.', ephemeral: true });
    const user = db.getUser(uid);
    const cost = prop.price * 100;
    if (user.balance < cost) return interaction.reply({ content: 'Solde insuffisant pour cet achat.', ephermal: true });
    // Check if already owned
    const owned = db.getUserProperties(uid);
    if (owned.some(o => o.id === id)) return interaction.reply({ content: 'Vous possédez déjà ce bien.', ephermal: true });
    db.adjustBalance(uid, -cost);
    db.addPropertyToUser(uid, id);
    
    const embed = new EmbedBuilder()
      .setTitle('🎉 Achat Immobilier Réussi')
      .setColor(COLORS.SUCCESS)
      .setDescription(`${prop.emoji} Vous avez acheté **${prop.name}** !`)
      .addFields(
        { name: '💰 Prix payé', value: `${formatCents(cost)} Ǥ`, inline: true },
        { name: '🏠 Loyer hebdomadaire', value: `${formatCents(prop.rent * 100)} Ǥ`, inline: true },
        { name: '💳 Solde restant', value: `${formatCents(db.getUser(uid).balance)} Ǥ`, inline: true }
      )
      .setFooter({ text: '🏠 Félicitations pour votre nouvel investissement !' });
    return interaction.reply({ embeds: [embed] });
  } else if (sub === 'mes_biens') {
    const owned = db.getUserProperties(uid);
    if (owned.length === 0) return interaction.reply('Vous ne possédez aucun bien pour le moment.');
    const lines = owned.map(p => `${p.emoji || '🏠'} **${p.name}** — ${formatCents(p.rent * 100)} Ǥ/semaine`);
    const embed = new EmbedBuilder()
      .setTitle('🏠 Votre Portfolio Immobilier')
      .setColor(COLORS.IMMO)
      .setDescription(lines.join('\n'))
      .setFooter({ text: `💼 ${owned.length} bien(s) en portefeuille` });
    await interaction.reply({ embeds: [embed] });
  } else if (sub === 'loyer') {
    const rentStatus = db.checkRentDue(uid);
    if (!rentStatus.due) {
      return interaction.reply({ 
        content: `🏠 Votre loyer n'est pas encore dû. Prochain paiement dans ${7 - Math.floor((Date.now() - rentStatus.housing.last_rent) / (24 * 60 * 60 * 1000))} jour(s).`, 
        ephemeral: true 
      });
    }
    
    const payment = db.payRent(uid);
    if (payment.paid > 0) {
      const embed = new EmbedBuilder()
        .setTitle('🏠 Loyer Payé')
        .setColor(COLORS.SUCCESS)
        .setDescription(`Loyer payé pour **${payment.property.name}**`)
        .addFields(
          { name: '💰 Montant', value: `${formatCents(payment.paid)} Ǥ`, inline: true },
          { name: '💳 Solde restant', value: `${formatCents(db.getUser(uid).balance)} Ǥ`, inline: true }
        );
      return interaction.reply({ embeds: [embed] });
    } else {
      return interaction.reply({ content: '❌ Solde insuffisant pour payer le loyer !', ephemeral: true });
    }
  } else if (sub === 'statut') {
    const housing = db.getUserHousing(uid);
    const rentStatus = db.checkRentDue(uid);
    
    const embed = new EmbedBuilder()
      .setTitle('🏠 Statut de Logement')
      .setColor(rentStatus.due ? COLORS.ERROR : COLORS.SUCCESS)
      .setDescription(`${housing.emoji || '🏠'} **${housing.name}**`)
      .addFields(
        { name: '🏠 Loyer hebdomadaire', value: `${formatCents(housing.rent * 100)} Ǥ`, inline: true },
        { name: '📅 Statut', value: rentStatus.due ? `❌ En retard (${rentStatus.daysLate} jour(s))` : '✅ À jour', inline: true },
        { name: '⏰ Prochain paiement', value: rentStatus.due ? 'Maintenant !' : `Dans ${7 - Math.floor((Date.now() - housing.last_rent) / (24 * 60 * 60 * 1000))} jour(s)`, inline: true }
      );
    
    if (rentStatus.due) {
      embed.setFooter({ text: '⚠️ Payez votre loyer avec /immo loyer' });
    }
    
    return interaction.reply({ embeds: [embed] });
  }
}