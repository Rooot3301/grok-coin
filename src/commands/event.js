import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getEvent } from '../events.js';
import { COLORS } from '../utils/symbols.js';

export const data = new SlashCommandBuilder()
  .setName('event')
  .setDescription('Consulter l\'événement économique en cours et ses impacts');

export async function execute(interaction, db, config) {
  const ev = getEvent();
  
  if (!ev) {
    const embed = new EmbedBuilder()
      .setTitle('📊 Situation Économique')
      .setColor(COLORS.NEUTRAL)
      .setDescription('**Période de stabilité**\n\nAucun événement majeur en cours. Les marchés évoluent normalement selon les tendances habituelles.')
      .addFields(
        { name: '📈 Marchés', value: 'Stables', inline: true },
        { name: '💼 Emploi', value: 'Normal', inline: true },
        { name: '🏠 Immobilier', value: 'Stable', inline: true }
      )
      .setFooter({ text: 'Un nouvel événement peut survenir à tout moment' })
      .setTimestamp();
    return interaction.reply({ embeds: [embed] });
  }
  
  const endsInMs = ev.endsAt - Date.now();
  const hours = Math.floor(endsInMs / 3600000);
  const minutes = Math.floor((endsInMs % 3600000) / 60000);
  
  // Analyse des effets
  const effects = ev.effects || {};
  const impactFields = [];
  
  if (effects.jobMultiplier) {
    const impact = effects.jobMultiplier > 1 ? 'Positif' : 'Négatif';
    const percent = ((effects.jobMultiplier - 1) * 100).toFixed(0);
    impactFields.push({ name: '💼 Emploi', value: `${impact} (${percent > 0 ? '+' : ''}${percent}%)`, inline: true });
  }
  
  if (effects.cryptoPriceMultiplier) {
    const impact = effects.cryptoPriceMultiplier > 1 ? 'Hausse' : 'Baisse';
    const percent = ((effects.cryptoPriceMultiplier - 1) * 100).toFixed(0);
    impactFields.push({ name: '₿ BitGrok', value: `${impact} (${percent > 0 ? '+' : ''}${percent}%)`, inline: true });
  }
  
  if (effects.immoMultiplier) {
    const impact = effects.immoMultiplier > 1 ? 'Hausse' : 'Baisse';
    const percent = ((effects.immoMultiplier - 1) * 100).toFixed(0);
    impactFields.push({ name: '🏠 Immobilier', value: `${impact} (${percent > 0 ? '+' : ''}${percent}%)`, inline: true });
  }
  
  const embed = new EmbedBuilder()
    .setTitle(`🌍 ${ev.name}`)
    .setColor(ev.color || COLORS.WARNING)
    .setDescription(ev.description)
    .addFields(
      { name: '⏰ Fin dans', value: `${hours}h ${minutes}m`, inline: true },
      { name: '📊 Type', value: ev.type || 'Économique', inline: true },
      { name: '🎯 Statut', value: 'En cours', inline: true }
    );
  
  if (impactFields.length > 0) {
    embed.addFields({ name: '📈 Impacts Économiques', value: '\u200B', inline: false });
    embed.addFields(...impactFields);
  }
  
  embed.setFooter({ text: 'Les effets sont appliqués automatiquement • Adaptez votre stratégie' })
    .setTimestamp();
    
  await interaction.reply({ embeds: [embed] });
}