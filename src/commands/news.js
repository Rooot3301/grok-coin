import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

/**
 * Commande /news pour afficher ou ajouter des actualités dans CopaingCity.
 * Les admins peuvent ajouter une news avec une durée (en heures) et un effet optionnel en JSON.
 */
export const data = new SlashCommandBuilder()
  .setName('news')
  .setDescription('Consulter ou gérer les actualités de CopaingCity')
  .addSubcommand(sub => sub
    .setName('voir')
    .setDescription('Afficher les actualités en cours'))
  .addSubcommand(sub => sub
    .setName('ajouter')
    .setDescription('Ajouter une nouvelle actualité (réservé aux admins)')
    .addStringOption(opt => opt.setName('texte').setDescription('Texte de l’actualité').setRequired(true))
    .addNumberOption(opt => opt.setName('durée').setDescription('Durée en heures (optionnel)').setRequired(false))
    .addStringOption(opt => opt.setName('effet').setDescription('Effet JSON optionnel (ex. {"price_multiplier":1.1})').setRequired(false))
  );

export async function execute(interaction, db, config) {
  const sub = interaction.options.getSubcommand();
  if (sub === 'voir') {
    const newsItems = db.getActiveNews();
    if (!newsItems || newsItems.length === 0) {
      return interaction.reply({ content: 'Aucune actualité en cours.', ephermal: true });
    }
    const embed = new EmbedBuilder()
      .setTitle('📰 Actualités de CopaingCity')
      .setColor(0x607d8b)
      .setDescription('Voici les dernières nouvelles qui influencent la ville.');
    for (const n of newsItems) {
      let line = n.text;
      if (n.expiresAt) {
        const msLeft = n.expiresAt - Date.now();
        const h = Math.max(1, Math.round(msLeft / 3600000));
        line += `\n*(expire dans ${h}h)*`;
      }
      embed.addFields({ name: `Actualité #${n.id}`, value: line, inline: false });
    }
    return interaction.reply({ embeds: [embed] });
  }
  if (sub === 'ajouter') {
    // Vérifier permissions admin
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'Seuls les administrateurs peuvent ajouter des actualités.', ephermal: true });
    }
    const texte = interaction.options.getString('texte', true);
    const duree = interaction.options.getNumber('durée');
    let effet = null;
    const effetStr = interaction.options.getString('effet');
    if (effetStr) {
      try {
        effet = JSON.parse(effetStr);
      } catch (err) {
        return interaction.reply({ content: 'Le champ effet doit être un JSON valide.', ephermal: true });
      }
    }
    db.addNews(texte, effet, duree);
    return interaction.reply({ content: '✅ Actualité ajoutée avec succès !', allowedMentions: { repliedUser: false } });
  }
  return interaction.reply({ content: 'Sous‑commande inconnue.', ephermal: true });
}